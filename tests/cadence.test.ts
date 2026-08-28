/**
 * Sync cadence tests.
 *
 * This decides how often we hit an undocumented third-party API, so the
 * failure modes matter in both directions: too slow means stale scores on a
 * Sunday, too fast means hammering ESPN all offseason for nothing.
 */
import { describe, it, expect } from 'vitest'
import {
  decideSync, LIVE_INTERVAL_MS, ROUTINE_INTERVAL_MS, OFFSEASON_INTERVAL_MS,
} from '@/lib/sync/cadence'

/** A given hour in US Eastern, expressed as a real instant. */
const et = (day: 'Sun' | 'Mon' | 'Tue' | 'Thu', hour: number) => {
  // Sept 2026: 6th is a Sunday, so 7th Mon, 8th Tue, 10th Thu.
  const date = { Sun: 6, Mon: 7, Tue: 8, Thu: 10 }[day]
  return new Date(`2026-09-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00-04:00`)
}

const base = {
  hasLiveMatchup: false,
  lastLiveSyncAt: null,
  lastRoutineSyncAt: null,
  seasonActive: true,
}

describe('decideSync — in season', () => {
  it('goes live during the Sunday window', () => {
    expect(decideSync({ ...base, now: et('Sun', 15) }).action).toBe('LIVE')
  })

  it('goes live on Monday night', () => {
    expect(decideSync({ ...base, now: et('Mon', 21) }).action).toBe('LIVE')
  })

  it('does not treat Tuesday afternoon as a game window', () => {
    const d = decideSync({
      ...base, now: et('Tue', 14),
      lastRoutineSyncAt: new Date(et('Tue', 14).getTime() - 60_000),
    })
    expect(d.action).toBe('IDLE')
  })

  it('does not treat an ordinary Friday afternoon as a game window', () => {
    // Regression: an over-generous Friday window made every Friday look live.
    const now = new Date('2026-09-11T15:00:00-04:00') // Friday
    const d = decideSync({
      ...base, now, lastRoutineSyncAt: new Date(now.getTime() - 60_000),
    })
    expect(d.action).toBe('IDLE')
  })

  it('escalates to live cadence once a surprise game is detected', () => {
    // Saturday games are not in any window, but the 15-minute routine sync
    // flips hasLiveMatchup and the next tick escalates.
    const now = new Date('2026-12-19T16:00:00-05:00') // Saturday
    expect(decideSync({ ...base, now }).action).toBe('ROUTINE')
    expect(decideSync({ ...base, now, hasLiveMatchup: true }).action).toBe('LIVE')
  })

  it('still syncs live when a matchup is in progress outside any window', () => {
    // Overtime, a delayed game, a Saturday special — the clock cannot know.
    const d = decideSync({ ...base, now: et('Tue', 3), hasLiveMatchup: true })
    expect(d.action).toBe('LIVE')
    expect(d.reason).toMatch(/in progress/)
  })

  it('does not re-sync live within the interval', () => {
    const now = et('Sun', 15)
    const d = decideSync({
      ...base, now, lastLiveSyncAt: new Date(now.getTime() - (LIVE_INTERVAL_MS - 1_000)),
      lastRoutineSyncAt: new Date(now.getTime() - 1_000),
    })
    expect(d.action).toBe('IDLE')
  })

  it('syncs live again once the interval has passed', () => {
    const now = et('Sun', 15)
    const d = decideSync({
      ...base, now, lastLiveSyncAt: new Date(now.getTime() - LIVE_INTERVAL_MS),
    })
    expect(d.action).toBe('LIVE')
  })

  it('falls back to routine refresh outside game windows', () => {
    const now = et('Tue', 10)
    const d = decideSync({
      ...base, now, lastRoutineSyncAt: new Date(now.getTime() - ROUTINE_INTERVAL_MS),
    })
    expect(d.action).toBe('ROUTINE')
  })
})

describe('decideSync — offseason', () => {
  const off = { ...base, seasonActive: false }

  it('idles rather than polling ESPN for data that cannot change', () => {
    const now = et('Sun', 15)
    const d = decideSync({
      ...off, now, lastRoutineSyncAt: new Date(now.getTime() - 60 * 60_000),
    })
    expect(d.action).toBe('IDLE')
  })

  it('still checks in occasionally, which also keeps the database awake', () => {
    // Supabase free tier pauses a project after ~7 days of inactivity.
    const now = et('Sun', 15)
    const d = decideSync({
      ...off, now, lastRoutineSyncAt: new Date(now.getTime() - OFFSEASON_INTERVAL_MS),
    })
    expect(d.action).toBe('ROUTINE')
  })

  it('ignores game windows entirely when the season is over', () => {
    // A real Date() here would be measured against the simulated clock and read
    // as days of staleness. Anchor the last sync to `now`.
    const now = et('Sun', 15)
    const d = decideSync({ ...off, now, lastRoutineSyncAt: new Date(now.getTime() - 60_000) })
    expect(d.action).toBe('IDLE')
  })
})

describe('decideSync — first run', () => {
  it('syncs immediately when nothing has ever run', () => {
    expect(decideSync({ ...base, now: et('Tue', 10) }).action).toBe('ROUTINE')
  })
})

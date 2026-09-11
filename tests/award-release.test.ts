/**
 * Award release timing.
 *
 * The failure modes matter in both directions: releasing early publishes a
 * Stud that Monday night then takes away, and releasing late — or never —
 * leaves the page empty through the days people actually visit it.
 */
import { describe, it, expect } from 'vitest'
import { decideRelease, RELEASE_HOUR_ET } from '@/lib/awards/release'

/** A given weekday and hour in US Eastern, as a real instant. */
const et = (day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat', hour: number) => {
  // Sept 2026: the 13th is a Sunday, so 14th Mon … 19th Sat.
  const date = { Sun: 13, Mon: 14, Tue: 15, Wed: 16, Thu: 17, Fri: 18, Sat: 19 }[day]
  return new Date(`2026-09-${date}T${String(hour).padStart(2, '0')}:00:00-04:00`)
}

const base = { finalWeeks: [1], generatedWeeks: [] as number[] }

describe('decideRelease', () => {
  it('publishes on Tuesday morning, once the week is final', () => {
    const d = decideRelease({ ...base, now: et('Tue', RELEASE_HOUR_ET) })
    expect(d.weeks).toEqual([1])
  })

  it('holds through Monday night, when the last game is still being played', () => {
    // The regression this exists for: a Prime Specimen named Sunday afternoon
    // and taken away by the 4pm slate.
    expect(decideRelease({ ...base, now: et('Sun', 15) }).weeks).toEqual([])
    expect(decideRelease({ ...base, now: et('Mon', 23) }).weeks).toEqual([])
  })

  it('holds in the small hours of Tuesday, before the release time', () => {
    expect(decideRelease({ ...base, now: et('Tue', RELEASE_HOUR_ET - 1) }).weeks).toEqual([])
    expect(decideRelease({ ...base, now: et('Tue', 0) }).weeks).toEqual([])
  })

  it('says what it is waiting for rather than going quiet', () => {
    const d = decideRelease({ ...base, now: et('Mon', 23) })
    expect(d.reason).toMatch(/Tuesday morning/)
  })

  it('stays open all week, so a lost Tuesday tick still catches up', () => {
    // A deploy or an outage at 06:00 must cost minutes, not a whole week.
    for (const day of ['Wed', 'Thu', 'Fri', 'Sat'] as const) {
      expect(decideRelease({ ...base, now: et(day, 10) }).weeks, day).toEqual([1])
    }
  })

  it('never republishes a week that already has awards', () => {
    // The point of publishing once: a second pass could name a different
    // winner after a stat correction, under someone already looking at it.
    const d = decideRelease({ ...base, now: et('Wed', 10), generatedWeeks: [1] })
    expect(d.weeks).toEqual([])
    expect(d.reason).toMatch(/already has awards/)
  })

  it('ignores a week that is not finished', () => {
    const d = decideRelease({ now: et('Tue', 9), finalWeeks: [], generatedWeeks: [] })
    expect(d.weeks).toEqual([])
  })

  it('catches up on several missed weeks in order', () => {
    const d = decideRelease({
      now: et('Tue', 9), finalWeeks: [1, 2, 3], generatedWeeks: [1],
    })
    expect(d.weeks).toEqual([2, 3])
  })

  it('releases only the weeks that are actually missing', () => {
    const d = decideRelease({
      now: et('Tue', 9), finalWeeks: [1, 2, 3], generatedWeeks: [1, 3],
    })
    expect(d.weeks).toEqual([2])
  })

  it('reads the clock in Eastern, not in UTC', () => {
    // 05:00 Eastern on Tuesday is 09:00 UTC the same day. Reading UTC would
    // publish an hour early in winter and four hours early in summer.
    const fiveEastern = new Date('2026-09-15T09:00:00Z')
    expect(decideRelease({ ...base, now: fiveEastern }).weeks).toEqual([])

    const sevenEastern = new Date('2026-09-15T11:00:00Z')
    expect(decideRelease({ ...base, now: sevenEastern }).weeks).toEqual([1])
  })

  it('holds on a Monday that is late evening in UTC terms', () => {
    // Monday 22:00 ET is Tuesday 02:00 UTC. A UTC weekday check would call
    // this Tuesday and publish before Monday Night Football has finished.
    const mondayNight = new Date('2026-09-15T02:00:00Z')
    expect(decideRelease({ ...base, now: mondayNight }).weeks).toEqual([])
  })
})

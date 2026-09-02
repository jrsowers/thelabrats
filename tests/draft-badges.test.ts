import { describe, it, expect } from 'vitest'
import { assignBadges, MIN_BADGES } from '../src/lib/draft/badges'
import type { FeedPick } from '../src/lib/draft/feed-data'

const pick = (o: Partial<FeedPick>): FeedPick => ({
  overallPickNumber: 1, round: 1, roundPick: 1, teamId: 1, teamName: 'T',
  manager: 'M', managerFull: 'M X', managerPhoto: null, playerId: 1,
  player: 'P', position: 'WR', proTeam: 'DET', leagueRank: 20, adp: 20,
  reachSlots: 0, betterAvailable: 0, roast: null, ...o,
})

/** A plausible fifteen-round haul. */
const roster = (): FeedPick[] =>
  Array.from({ length: 15 }, (_, i) => pick({
    overallPickNumber: i * 12 + 1, round: i + 1,
    betterAvailable: [0, 3, 25, 1, 40, 8, 2, 14, 0, 31, 5, 9, 1, 0, 0][i],
    reachSlots: [-2, -8, 14, -1, 22, 3, -14, 6, -4, 18, 1, 2, 0, 0, 0][i],
    position: i === 13 ? 'DST' : i === 14 ? 'K' : 'WR',
  }))

describe('badge assignment', () => {
  const badges = assignBadges(roster())

  it('gives every manager at least the floor', () => {
    expect(badges.size).toBeGreaterThanOrEqual(MIN_BADGES)
  })

  it('leans negative, which is what an F looks like', () => {
    const tones = [...badges.values()].map((b) => b.tone)
    const bad = tones.filter((t) => t === 'bad').length
    const good = tones.filter((t) => t === 'good').length
    expect(bad).toBeGreaterThanOrEqual(good)
    expect(good).toBeLessThanOrEqual(2)
  })

  it('always finds something nice to say, exactly once or twice', () => {
    expect([...badges.values()].filter((b) => b.tone === 'good').length).toBeGreaterThanOrEqual(1)
  })

  it('is deterministic — the same roster gives the same badges', () => {
    const a = assignBadges(roster()), b = assignBadges(roster())
    expect([...a.entries()]).toEqual([...b.entries()])
  })

  it('never badges the same pick twice', () => {
    expect(new Set(badges.keys()).size).toBe(badges.size)
  })

  it('calls out an early kicker specifically', () => {
    const withK = roster().map((p, i) => i === 5 ? { ...p, position: 'K' as const, round: 6 } : p)
    const b = assignBadges(withK)
    const k = withK.find((p) => p.position === 'K' && p.round === 6)!
    expect(b.get(k.overallPickNumber)?.label).toBe('U OK BRO?')
  })

  it('handles a short or empty list without throwing', () => {
    expect(assignBadges([]).size).toBe(0)
    expect(assignBadges([pick({})]).size).toBeGreaterThan(0)
  })

  it('explains every badge', () => {
    for (const b of badges.values()) expect(b.title.length).toBeGreaterThan(5)
  })
})

/**
 * Award tests (§22.8): deterministic, regenerable, and never shown empty.
 */
import { describe, it, expect } from 'vitest'
import {
  computeWeeklyAwards, computeAwardLeaderboard, AWARD_CATALOG,
  type AwardMatchup,
} from '@/lib/awards/compute'

const g = (
  matchupId: number, week: number, home: number, away: number,
  hs: number, as: number, status = 'FINAL',
): AwardMatchup => ({
  matchupId, week, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, status,
})

/** A week with a blowout, a nail-biter, and a high-scoring loser. */
const week1: AwardMatchup[] = [
  g(1, 1, 1, 2, 150.0, 60.0),   // blowout, top score
  g(2, 1, 3, 4, 101.0, 100.5),  // photo finish
  g(3, 1, 5, 6, 120.0, 130.0),  // 5 loses with a big score
  g(4, 1, 7, 8, 70.0, 68.0),    // dumpster fire, low winner
]

const byType = (m: AwardMatchup[], w = 1) =>
  new Map(computeWeeklyAwards(m, w).map((a) => [a.type, a]))

describe('computeWeeklyAwards', () => {
  it('returns nothing before any game is final', () => {
    const live = week1.map((m) => ({ ...m, status: 'LIVE' }))
    expect(computeWeeklyAwards(live, 1)).toEqual([])
  })

  it('ignores other weeks', () => {
    expect(computeWeeklyAwards(week1, 2)).toEqual([])
  })

  it('gives Manager of the Week to the top score', () => {
    expect(byType(week1).get('MANAGER_OF_THE_WEEK')?.teamIds).toEqual([1])
  })

  it('gives Bad Beat to the highest-scoring LOSER, not the highest scorer', () => {
    // Team 1 scored 150 but won. Team 5 scored 120 and lost — that is the beat.
    const a = byType(week1).get('BAD_BEAT')!
    expect(a.teamIds).toEqual([5])
    expect(a.headline).toMatch(/still lost/)
  })

  it('gives Highway Robbery to the lowest-scoring WINNER', () => {
    expect(byType(week1).get('HIGHWAY_ROBBERY')?.teamIds).toEqual([7])
  })

  it('finds the closest matchup', () => {
    const a = byType(week1).get('PHOTO_FINISH')!
    expect(a.matchupId).toBe(2)
    expect(a.metric.value).toBe('0.5')
  })

  it('awards a blowout only when it is actually a blowout', () => {
    expect(byType(week1).get('PUBLIC_EXECUTION')?.matchupId).toBe(1)
    // A week of close games should produce no blowout award at all (§22.2).
    const tight: AwardMatchup[] = [g(1, 1, 1, 2, 100, 98), g(2, 1, 3, 4, 95, 93)]
    expect(byType(tight).has('PUBLIC_EXECUTION')).toBe(false)
  })

  it('does not award the same game as both the closest and the widest', () => {
    const single: AwardMatchup[] = [g(1, 1, 1, 2, 150, 60)]
    const awards = computeWeeklyAwards(single, 1)
    const ids = awards.filter((a) => a.type === 'PHOTO_FINISH' || a.type === 'PUBLIC_EXECUTION')
    expect(ids.length).toBeLessThanOrEqual(1)
  })

  it('does not award the same game as both shootout and dumpster fire', () => {
    const single: AwardMatchup[] = [g(1, 1, 1, 2, 100, 90)]
    const awards = computeWeeklyAwards(single, 1)
    const types = awards.map((a) => a.type)
    expect(types.filter((t) => t === 'SHOOTOUT' || t === 'DUMPSTER_FIRE')).toHaveLength(1)
  })

  it('finds the highest and lowest combined scores', () => {
    const m = byType(week1)
    // Totals: m1 210, m2 201.5, m3 250, m4 138.
    expect(m.get('SHOOTOUT')?.matchupId).toBe(3)
    expect(m.get('DUMPSTER_FIRE')?.matchupId).toBe(4)
  })

  it('omits Bad Beat and Highway Robbery when every game tied', () => {
    const ties: AwardMatchup[] = [g(1, 1, 1, 2, 100, 100), g(2, 1, 3, 4, 90, 90)]
    const m = byType(ties)
    expect(m.has('BAD_BEAT')).toBe(false)
    expect(m.has('HIGHWAY_ROBBERY')).toBe(false)
  })

  it('is deterministic across runs', () => {
    const a = computeWeeklyAwards(week1, 1).map((x) => `${x.type}:${x.teamIds}`)
    const b = computeWeeklyAwards(week1, 1).map((x) => `${x.type}:${x.teamIds}`)
    expect(a).toEqual(b)
  })

  it('builds every headline from real values, never a placeholder', () => {
    for (const a of computeWeeklyAwards(week1, 1)) {
      expect(a.headline.length).toBeGreaterThan(0)
      expect(a.headline).not.toMatch(/undefined|NaN|null/)
      expect(a.metric.value).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('computeAwardLeaderboard', () => {
  it('tallies repeat winners across weeks', () => {
    const two = [...week1, ...week1.map((m) => ({ ...m, matchupId: m.matchupId + 10, week: 2 }))]
    const board = computeAwardLeaderboard(two, 2)
    expect(board.get('MANAGER_OF_THE_WEEK')?.[0]).toEqual({ teamId: 1, count: 2 })
  })
})

describe('AWARD_CATALOG', () => {
  it('declares the blocked awards rather than hiding them', () => {
    const blocked = AWARD_CATALOG.filter((a) => a.blocked)
    expect(blocked.length).toBeGreaterThan(0)
    for (const a of blocked) expect(a.blocked).toMatch(/needs /)
  })

  it('every computable award in the catalog can actually be produced', () => {
    const computable = new Set(AWARD_CATALOG.filter((a) => !a.blocked).map((a) => a.type))
    const produced = new Set(computeWeeklyAwards(week1, 1).map((a) => a.type))
    for (const type of computable) expect(produced.has(type as never)).toBe(true)
  })
})

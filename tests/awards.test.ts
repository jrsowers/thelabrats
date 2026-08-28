/**
 * Award engine tests (§22.8).
 *
 * Two rules matter most: every award is won by a MANAGER (including the ones
 * describing a matchup outcome — "lost by the largest margin" belongs to the
 * team that lost it), and an award with no qualifying candidate is OMITTED
 * rather than shown empty.
 */
import { describe, it, expect } from 'vitest'
import {
  computeWeeklyAwards, computeAwardLeaderboard, type AwardMatchup,
} from '@/lib/awards/compute'
import { AWARDS, awardsBySection, isComputable } from '@/lib/awards/catalog'

const g = (
  matchupId: number, week: number, home: number, away: number,
  hs: number, as: number, status = 'FINAL',
): AwardMatchup => ({
  matchupId, week, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, status,
})

/** Scores: t1 150, t2 60, t3 101, t4 100.5, t5 120, t6 130, t7 70, t8 68. */
const week1: AwardMatchup[] = [
  g(1, 1, 1, 2, 150.0, 60.0),   // t1 wins big; t2 is the league's worst score
  g(2, 1, 3, 4, 101.0, 100.5),  // tightest game
  g(3, 1, 5, 6, 120.0, 130.0),  // t5 loses with a strong score
  g(4, 1, 7, 8, 70.0, 68.0),    // t7 wins ugly
]

const byKey = (m: AwardMatchup[], w = 1) =>
  new Map(computeWeeklyAwards(m, w).map((a) => [a.key, a]))

describe('computeWeeklyAwards', () => {
  it('returns nothing before any game is final', () => {
    expect(computeWeeklyAwards(week1.map((m) => ({ ...m, status: 'LIVE' })), 1)).toEqual([])
  })

  it('ignores other weeks', () => {
    expect(computeWeeklyAwards(week1, 2)).toEqual([])
  })

  it('gives The Cat Burglar to the lowest-scoring WINNER', () => {
    const a = byKey(week1).get('cat_burglar')!
    expect(a.teamId).toBe(7)          // 70.0, the weakest winning score
    expect(a.metricValue).toBe('70.0')
  })

  it('gives The Dumpster Fire to the worst score in the LEAGUE, win or lose', () => {
    // t2 scored 60.0 — lower than any other team, and lost.
    const a = byKey(week1).get('dumpster_fire')!
    expect(a.teamId).toBe(2)
    expect(a.metricValue).toBe('60.0')
  })

  it('gives The Bad Beat to the highest-scoring LOSER, not the highest scorer', () => {
    // t1 scored 150 but won. t5 scored 120 and lost — that is the beat.
    const a = byKey(week1).get('bad_beat')!
    expect(a.teamId).toBe(5)
    expect(a.headline).toMatch(/still lost/)
  })

  it('gives The Public Execution to the LOSER, not the winner', () => {
    // t2 lost by 90. The award belongs to the team that was beaten.
    const a = byKey(week1).get('public_execution')!
    expect(a.teamId).toBe(2)
    expect(a.opponentId).toBe(1)
    expect(a.metricValue).toBe('90.0')
  })

  it('names an opponent on every award', () => {
    for (const a of computeWeeklyAwards(week1, 1)) {
      expect(a.opponentId).not.toBeNull()
    }
  })

  it('omits win/loss awards when every game tied', () => {
    const ties: AwardMatchup[] = [g(1, 1, 1, 2, 100, 100), g(2, 1, 3, 4, 90, 90)]
    const m = byKey(ties)
    expect(m.has('bad_beat')).toBe(false)
    expect(m.has('cat_burglar')).toBe(false)
    expect(m.has('public_execution')).toBe(false)
    // A worst score still exists even when nobody won.
    expect(m.get('dumpster_fire')?.teamId).toBe(3)
  })

  it('is deterministic across runs', () => {
    const run = () => computeWeeklyAwards(week1, 1).map((a) => `${a.key}:${a.teamId}`)
    expect(run()).toEqual(run())
  })

  it('builds every headline from real values', () => {
    for (const a of computeWeeklyAwards(week1, 1)) {
      expect(a.headline).not.toMatch(/undefined|NaN|null/)
      expect(a.metricValue).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('computeAwardLeaderboard', () => {
  it('tallies repeat winners across weeks', () => {
    const two = [...week1, ...week1.map((m) => ({ ...m, matchupId: m.matchupId + 10, week: 2 }))]
    const board = computeAwardLeaderboard(two, 2)
    expect(board.get('dumpster_fire')?.[0]).toEqual({ teamId: 2, count: 2 })
  })
})

describe('catalog', () => {
  it('has six Studs and six Duds, all manager awards', () => {
    expect(awardsBySection('STUDS')).toHaveLength(6)
    expect(awardsBySection('DUDS')).toHaveLength(6)
    expect(AWARDS.every((a) => a.category === 'MANAGER')).toBe(true)
  })

  it('gives every award a unique key AND a unique name', () => {
    // A duplicated name renders two identical cards on one page.
    const keys = AWARDS.map((a) => a.key)
    const names = AWARDS.map((a) => a.name)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('documents a formula and a description for every award', () => {
    for (const a of AWARDS) {
      expect(a.formula.length).toBeGreaterThan(20)
      expect(a.blurb.length).toBeGreaterThan(10)
    }
  })

  it('every computable award is actually produced by the engine', () => {
    const produced = new Set(computeWeeklyAwards(week1, 1).map((a) => a.key))
    for (const def of AWARDS.filter(isComputable)) {
      expect(produced.has(def.key as never), `${def.name} is marked computable`).toBe(true)
    }
  })

  it('every award the engine produces exists in the catalog', () => {
    const known = new Set(AWARDS.map((a) => a.key))
    for (const a of computeWeeklyAwards(week1, 1)) {
      expect(known.has(a.key), `engine emits ${a.key}`).toBe(true)
    }
  })
})

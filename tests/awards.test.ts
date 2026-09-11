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
  computeWeeklyAwards, computeAwardLeaderboard,
  type AwardMatchup, type AwardPlayer,
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

const byKeyWith = (m: AwardMatchup[], players: AwardPlayer[], w = 1) =>
  new Map(computeWeeklyAwards(m, w, players).map((a) => [a.key as string, a]))

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
    // Fed a week with everything `isComputable` claims we collect: final
    // scores, ESPN projections and player lines. Anything the catalog marks
    // computable but the engine does not emit ships as a silent placeholder.
    const withProjections = week1.map((m, i) =>
      // One genuine upset, so the Giant Killer / Choke Artist pair qualifies.
      i === 2 ? { ...m, homeProjected: 132.5, awayProjected: 110 }
      : { ...m, homeProjected: m.homeScore, awayProjected: m.awayScore },
    )
    const players: AwardPlayer[] = [{
      seasonTeamId: 1, espnPlayerId: 1, name: 'Star', position: 'WR', nflTeam: 'PHI',
      isStarter: true, actualPoints: 30, projectedPoints: 12,
    }]
    const produced = new Set(computeWeeklyAwards(withProjections, 1, players).map((a) => a.key))
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

describe('player-driven awards', () => {
  const p = (
    seasonTeamId: number, name: string, isStarter: boolean,
    actualPoints: number | null, projectedPoints: number | null,
  ): AwardPlayer => ({
    seasonTeamId, espnPlayerId: name.length * 100 + seasonTeamId, name,
    position: 'WR', nflTeam: 'PHI', isStarter, actualPoints, projectedPoints,
  })

  const roster: AwardPlayer[] = [
    p(1, 'Loud Starter', true, 31.4, 14.0),   // best actual AND biggest beat
    p(2, 'Quiet Starter', true, 9.0, 18.0),
    p(3, 'Bench Monster', false, 44.0, 12.0), // outscores everyone, from the bench
    p(4, 'Not Kicked Off', true, null, 26.0), // no result yet
  ]

  it('gives The Prime Specimen to the manager who STARTED the best player', () => {
    const a = byKeyWith(week1, roster).get('prime_specimen')!
    expect(a.teamId).toBe(1)
    expect(a.metricValue).toBe('31.4')
    expect(a.player?.name).toBe('Loud Starter')
  })

  it('does not hand it to a bench player who outscored the field', () => {
    // Leaving a 44-point week on the bench is a Bench Bum story. The award is
    // for the manager's decision, and that was the opposite decision.
    const a = byKeyWith(week1, roster).get('prime_specimen')!
    expect(a.player?.name).not.toBe('Bench Monster')
  })

  it('ignores a starter whose game has not kicked off', () => {
    // actualPoints null must not read as zero — otherwise this player is the
    // week's biggest projection miss without having played a snap.
    const a = byKeyWith(week1, roster).get('nostradamus')!
    expect(a.player?.name).toBe('Loud Starter')
    expect(a.metricValue).toBe('17.4')
  })

  it('omits Nostradamus when every starter missed his projection', () => {
    const allMissed = [p(1, 'Sad Starter', true, 4.0, 20.0)]
    expect(byKeyWith(week1, allMissed).has('nostradamus')).toBe(false)
  })

  it('omits player awards entirely before any player has a result', () => {
    const pregame = [p(1, 'Waiting', true, null, 20.0)]
    const keys = byKeyWith(week1, pregame)
    expect(keys.has('prime_specimen')).toBe(false)
    expect(keys.has('nostradamus')).toBe(false)
  })

  it('awards them mid-week, before any matchup is final', () => {
    // The best performance of a Sunday is knowable on Sunday. Waiting for the
    // week to finalize would mean an empty page during the only window anyone
    // is actually looking at it.
    const live = week1.map((m) => ({ ...m, status: 'LIVE' }))
    const keys = byKeyWith(live, roster)
    expect(keys.has('prime_specimen')).toBe(true)
    expect(keys.has('cat_burglar')).toBe(false)
  })
})

describe('projection-driven awards', () => {
  // t5 was projected to beat t6 by 22.5 and lost by 10.
  const projected: AwardMatchup[] = [
    { ...week1[0], homeProjected: 140, awayProjected: 90 },
    { ...week1[2], homeProjected: 132.5, awayProjected: 110.0 },
  ]

  it('gives The Giant Killer to the underdog who won', () => {
    const a = byKey(projected).get('giant_killer')!
    expect(a.teamId).toBe(6)
    expect(a.opponentId).toBe(5)
    expect(a.metricValue).toBe('22.5')
  })

  it('gives The Choke Artist to the favourite who lost — the same matchup', () => {
    const a = byKey(projected).get('choke_artist')!
    expect(a.teamId).toBe(5)
    expect(a.opponentId).toBe(6)
    expect(a.metricValue).toBe('22.5')
  })

  it('does not treat a favourite who won as an upset', () => {
    // t1 was projected to win by 50 and did. Neither award applies.
    const chalk: AwardMatchup[] = [{ ...week1[0], homeProjected: 140, awayProjected: 90 }]
    const keys = byKey(chalk)
    expect(keys.has('giant_killer')).toBe(false)
    expect(keys.has('choke_artist')).toBe(false)
  })

  it('omits both when ESPN published no projection', () => {
    const keys = byKey(week1)
    expect(keys.has('giant_killer')).toBe(false)
    expect(keys.has('choke_artist')).toBe(false)
  })
})

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
  type AwardMatchup, type AwardPlayer, type AwardTransaction,
} from '@/lib/awards/compute'
import { AWARDS, awardsBySection, isComputable } from '@/lib/awards/catalog'
import { buildCommentary } from '@/lib/awards/commentary'

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

const byKeyAll = (
  m: AwardMatchup[], players: AwardPlayer[], transactions: AwardTransaction[], w = 1,
) => new Map(computeWeeklyAwards(m, w, players, transactions).map((a) => [a.key as string, a]))

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
  it('sorts every award into a section, and every award is won by a manager', () => {
    // Deliberately NOT an even split any more. James added seven awards on
    // 2026-09-14 to break the clustering, most of them Studs, and called the
    // imbalance explicitly: an award library is meant to keep evolving.
    expect(AWARDS).toHaveLength(20)
    expect(awardsBySection('STUDS').length + awardsBySection('DUDS').length).toBe(AWARDS.length)
    expect(awardsBySection('STUDS').length).toBeGreaterThan(0)
    expect(awardsBySection('DUDS').length).toBeGreaterThan(0)
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
    const players: AwardPlayer[] = [
      { seasonTeamId: 1, espnPlayerId: 1, name: 'Star', position: 'WR', nflTeam: 'PHI',
        isStarter: true, lineupSlotId: 4, eligibleSlots: [4, 23], actualPoints: 30,
        projectedPoints: 12 },
      { seasonTeamId: 2, espnPlayerId: 2, name: 'Pickup', position: 'RB', nflTeam: 'DAL',
        isStarter: true, lineupSlotId: 2, eligibleSlots: [2, 23], actualPoints: 18,
        projectedPoints: 8 },
      // A benched scorer, so the lineup awards have a gap to find.
      { seasonTeamId: 1, espnPlayerId: 3, name: 'Benched', position: 'WR', nflTeam: 'NYG',
        isStarter: false, lineupSlotId: 20, eligibleSlots: [4, 23], actualPoints: 25,
        projectedPoints: 10 },
      // A second overperforming starter, so Slay Girl Slay has a real winner
      // rather than being handed to whoever managed exactly one.
      { seasonTeamId: 1, espnPlayerId: 4, name: 'Also Good', position: 'RB', nflTeam: 'SF',
        isStarter: true, lineupSlotId: 2, eligibleSlots: [2, 23], actualPoints: 22,
        projectedPoints: 9 },
      // A third team, so One Man Army and The Socialist land on different
      // managers instead of collapsing onto one.
      { seasonTeamId: 5, espnPlayerId: 5, name: 'Solo', position: 'QB', nflTeam: 'BUF',
        isStarter: true, lineupSlotId: 0, eligibleSlots: [0, 7], actualPoints: 40,
        projectedPoints: 41 },
    ]
    const transactions: AwardTransaction[] = [
      { seasonTeamId: 2, kind: 'FREE_AGENT', acquiredPlayerIds: [2] },
      { seasonTeamId: 2, kind: 'LINEUP', acquiredPlayerIds: [] },
    ]
    // One snapshot showing team 6 behind, so Sweatin' It Out qualifies too,
    // and one team that slid down the table for The Free Fall.
    const snapshots = [{ matchupId: 3, homeScore: 130, awayScore: 10 }]
    const movement = new Map([[7, -3]])
    const produced = new Set(
      computeWeeklyAwards(
        withProjections, 1, players, transactions, { 4: 1, 2: 1, 0: 1, 23: 1 },
        snapshots, movement,
      ).map((a) => a.key),
    )
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
    position: 'WR', nflTeam: 'PHI', isStarter,
    lineupSlotId: isStarter ? 4 : 20, eligibleSlots: [4, 23, 7],
    actualPoints, projectedPoints,
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

  it('decides player awards without waiting on a final matchup', () => {
    // The engine can settle these from player lines alone. WHEN the league
    // sees them is a separate decision — awards publish once, Tuesday morning
    // (see release.ts) — but the two concerns stay independent, which is what
    // lets preview mode render a simulated week.
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

describe('transaction-driven awards', () => {
  const p = (
    seasonTeamId: number, espnPlayerId: number, name: string,
    isStarter: boolean, actualPoints: number | null,
  ): AwardPlayer => ({
    seasonTeamId, espnPlayerId, name, position: 'RB', nflTeam: 'DAL',
    isStarter, lineupSlotId: isStarter ? 2 : 20, eligibleSlots: [2, 23, 7],
    actualPoints, projectedPoints: 7,
  })

  describe('The Waiver Wire Wizard', () => {
    const roster = [
      p(2, 10, 'Free Agent Find', true, 24.5),
      p(2, 11, 'Benched Pickup', false, 31.0),
      p(1, 12, 'Rostered All Along', true, 40.0), // never acquired
      p(3, 13, 'Traded For', true, 33.0),
    ]

    it('credits the manager who claimed the highest-scoring pickup', () => {
      const txns: AwardTransaction[] = [{ seasonTeamId: 2, kind: 'FREE_AGENT', acquiredPlayerIds: [10] }]
      const a = byKeyAll(week1, roster, txns).get('waiver_wire_wizard')!
      expect(a.teamId).toBe(2)
      expect(a.player?.name).toBe('Free Agent Find')
      expect(a.metricValue).toBe('24.5')
    })

    it('ignores a high scorer who was never picked up', () => {
      // The 40-point week belongs to someone rostered since the draft.
      const txns: AwardTransaction[] = [{ seasonTeamId: 2, kind: 'WAIVER', acquiredPlayerIds: [10] }]
      const a = byKeyAll(week1, roster, txns).get('waiver_wire_wizard')!
      expect(a.player?.name).not.toBe('Rostered All Along')
    })

    it('counts a pickup who scored from the bench, and says he was benched', () => {
      // The catalog formula is "grabbed the highest scoring free agent" — it
      // does not require starting him. The card says which, rather than the
      // engine silently deciding.
      const txns: AwardTransaction[] = [{ seasonTeamId: 2, kind: 'FREE_AGENT', acquiredPlayerIds: [10, 11] }]
      const a = byKeyAll(week1, roster, txns).get('waiver_wire_wizard')!
      expect(a.player?.name).toBe('Benched Pickup')
      expect(a.supporting).toContainEqual({ label: 'Lineup', value: 'Benched' })
    })

    it('excludes players acquired by trade', () => {
      // Winning a trade is a different skill, and a different award.
      const txns: AwardTransaction[] = [{ seasonTeamId: 3, kind: 'TRADE', acquiredPlayerIds: [13] }]
      expect(byKeyAll(week1, roster, txns).has('waiver_wire_wizard')).toBe(false)
    })

    it('omits the award in a week with no pickups', () => {
      expect(byKeyAll(week1, roster, []).has('waiver_wire_wizard')).toBe(false)
    })

    it('credits the claiming team, not whoever holds him now', () => {
      // A pickup can be dropped again days later; the claim is what is judged.
      const moved = [p(1, 10, 'Free Agent Find', true, 24.5)]
      const txns: AwardTransaction[] = [{ seasonTeamId: 2, kind: 'FREE_AGENT', acquiredPlayerIds: [10] }]
      expect(byKeyAll(week1, moved, txns).get('waiver_wire_wizard')!.teamId).toBe(2)
    })
  })

  describe('The Galaxy Brain', () => {
    // t5 lost to t6; t1 won big. Both are busy.
    const busy = (teamId: number, kinds: string[]): AwardTransaction[] =>
      kinds.map((kind) => ({ seasonTeamId: teamId, kind, acquiredPlayerIds: [] }))

    it('counts every kind of move, and only among managers who lost', () => {
      const txns = [
        ...busy(5, ['FREE_AGENT', 'DROP', 'LINEUP', 'LINEUP', 'WAIVER']),
        ...busy(1, ['FREE_AGENT', 'LINEUP', 'LINEUP', 'LINEUP', 'TRADE', 'DROP']), // t1 WON
      ]
      const a = byKeyAll(week1, [], txns).get('galaxy_brain')!
      expect(a.teamId).toBe(5)
      expect(a.metricValue).toBe('5')
    })

    it('counts lineup swaps, which is the whole point of the joke', () => {
      const txns = busy(5, ['LINEUP', 'LINEUP', 'LINEUP', 'LINEUP'])
      expect(byKeyAll(week1, [], txns).get('galaxy_brain')!.metricValue).toBe('4')
    })

    it('breaks the total down, so nobody has to guess what counted', () => {
      const txns = busy(5, ['FREE_AGENT', 'FREE_AGENT', 'LINEUP', 'IR_PLACE'])
      const a = byKeyAll(week1, [], txns).get('galaxy_brain')!
      expect(a.supporting).toContainEqual({ label: 'Free agents', value: '2' })
      expect(a.supporting).toContainEqual({ label: 'Lineup changes', value: '1' })
      expect(a.supporting).toContainEqual({ label: 'To IR', value: '1' })
    })

    it('omits the award when the busiest loser made a single move', () => {
      // One waiver claim is not a big brain. Saying nothing beats mocking
      // somebody for managing their team once (§22.2).
      expect(byKeyAll(week1, [], busy(5, ['WAIVER'])).has('galaxy_brain')).toBe(false)
    })

    it('omits the award when every loser stood pat', () => {
      expect(byKeyAll(week1, [], []).has('galaxy_brain')).toBe(false)
    })
  })
})

describe('lineup-efficiency awards', () => {
  const QB = 0, RB = 2, WR = 4, OP = 7, BE = 20, IR = 21, FLEX = 23
  const SLOTS = { [QB]: 1, [RB]: 1, [WR]: 1, [FLEX]: 1, [BE]: 5, [IR]: 2 }

  const pl = (
    seasonTeamId: number, espnPlayerId: number, name: string,
    lineupSlotId: number, actualPoints: number | null, eligibleSlots: number[],
  ): AwardPlayer => ({
    seasonTeamId, espnPlayerId, name, position: 'RB', nflTeam: 'DAL',
    isStarter: lineupSlotId !== BE && lineupSlotId !== IR,
    lineupSlotId, eligibleSlots, actualPoints, projectedPoints: 10,
  })

  /** A manager who started exactly the right people. */
  const perfect = (teamId: number) => [
    pl(teamId, teamId * 100 + 1, 'QB1', QB, 20, [QB, OP]),
    pl(teamId, teamId * 100 + 2, 'RB1', RB, 15, [RB, FLEX, OP]),
    pl(teamId, teamId * 100 + 3, 'WR1', WR, 12, [WR, FLEX, OP]),
    pl(teamId, teamId * 100 + 4, 'FLEX1', FLEX, 10, [RB, FLEX, OP]),
    pl(teamId, teamId * 100 + 5, 'Bench', BE, 2, [RB, FLEX, OP]),
  ]

  /** A manager who benched a better player than the one he started. */
  const wasteful = (teamId: number) => [
    pl(teamId, teamId * 100 + 1, 'QB1', QB, 18, [QB, OP]),
    pl(teamId, teamId * 100 + 2, 'RB1', RB, 4, [RB, FLEX, OP]),
    pl(teamId, teamId * 100 + 3, 'WR1', WR, 9, [WR, FLEX, OP]),
    pl(teamId, teamId * 100 + 4, 'FLEX1', FLEX, 5, [RB, FLEX, OP]),
    pl(teamId, teamId * 100 + 5, 'Benched Star', BE, 27, [RB, FLEX, OP]),
  ]

  const run = (players: AwardPlayer[]) =>
    new Map(computeWeeklyAwards(week1, 1, players, [], SLOTS).map((a) => [a.key as string, a]))

  it('gives The Mastermind to the tightest lineup of the week', () => {
    const a = run([...perfect(1), ...wasteful(2)]).get('mastermind')!
    expect(a.teamId).toBe(1)
    expect(a.metricValue).toBe('0.0')
  })

  it('gives The Bench Bum to the loosest, and names the player', () => {
    const a = run([...perfect(1), ...wasteful(2)]).get('bench_bum')!
    expect(a.teamId).toBe(2)
    // Benched Star (27) should have replaced RB1 (4): a 23-point gap.
    expect(a.metricValue).toBe('23.0')
    expect(a.supporting).toContainEqual({ label: 'Should have started', value: 'Benched Star (27.0)' })
  })

  it('never hands both ends of the same measure to one manager', () => {
    // A single-team week would otherwise make the same person both the
    // tightest and the loosest lineup.
    const keys = run(perfect(1))
    expect(keys.has('mastermind')).toBe(true)
    expect(keys.has('bench_bum')).toBe(false)
  })

  it('omits The Bench Bum when nobody wasted anything', () => {
    const keys = run([...perfect(1), ...perfect(2)])
    expect(keys.has('bench_bum')).toBe(false)
  })

  it('does not count an IR player as startable', () => {
    // He cannot legally be started, so a 40-point week on IR is not a gap —
    // otherwise the unluckiest injury wins The Bench Bum every time.
    const withIr = [
      ...perfect(1),
      pl(1, 199, 'Stashed', IR, 40, [RB, FLEX, OP]),
    ]
    const a = run([...withIr, ...wasteful(2)]).get('mastermind')!
    expect(a.teamId).toBe(1)
    expect(a.metricValue).toBe('0.0')
  })

  it('treats a missing stat line as a zero, not as unknown', () => {
    // A final week has nothing left to play. Reading null as "unknown" would
    // drop an eligible player out of the optimal lineup and understate the gap.
    const noLine = [
      pl(3, 301, 'QB1', QB, 10, [QB, OP]),
      pl(3, 302, 'RB1', RB, null, [RB, FLEX, OP]),
      pl(3, 303, 'WR1', WR, 8, [WR, FLEX, OP]),
      pl(3, 304, 'FLEX1', FLEX, 6, [RB, FLEX, OP]),
    ]
    const a = run([...noLine, ...wasteful(2)]).get('mastermind')!
    expect(a.teamId).toBe(3)
    expect(a.metricValue).toBe('0.0')
  })

  it('stays silent when eligibility was never collected', () => {
    // Before eligible_slots was stored there was no constraint set, and an
    // "optimal" lineup computed from nothing is a fabricated number on a card.
    const blind = perfect(1).map((p) => ({ ...p, eligibleSlots: [] }))
    expect(run(blind).has('mastermind')).toBe(false)
  })

  it('stays silent when the league has no lineup shape', () => {
    const noSlots = new Map(
      computeWeeklyAwards(week1, 1, perfect(1), [], {}).map((a) => [a.key as string, a]),
    )
    expect(noSlots.has('mastermind')).toBe(false)
  })
})

describe('roster-shape awards', () => {
  // These exist to break the clustering: every other award ranks managers by
  // how MUCH they scored, so concentration and consistency must not.
  const sh = (
    seasonTeamId: number, espnPlayerId: number, name: string,
    actualPoints: number, projectedPoints: number, isStarter = true,
  ): AwardPlayer => ({
    seasonTeamId, espnPlayerId, name, position: 'WR', nflTeam: 'PHI',
    isStarter, lineupSlotId: isStarter ? 4 : 20, eligibleSlots: [4, 23],
    actualPoints, projectedPoints,
  })

  // Team 1: one player is 80 of 100. Team 2: four players, 25 each.
  const carried = [
    sh(1, 11, 'The Guy', 80, 40), sh(1, 12, 'Filler A', 10, 10),
    sh(1, 13, 'Filler B', 7, 7), sh(1, 14, 'Filler C', 3, 3),
  ]
  const shared = [
    sh(2, 21, 'Even A', 25, 30), sh(2, 22, 'Even B', 25, 30),
    sh(2, 23, 'Even C', 25, 30), sh(2, 24, 'Even D', 25, 30),
  ]
  // week1 game 1 is t1 150.0 over t2 60.0, so team 1 won and team 2 lost.
  const run = (players: AwardPlayer[]) =>
    new Map(computeWeeklyAwards(week1, 1, players, [], {}, []).map((a) => [a.key as string, a]))

  it('gives The One Man Army to the most concentrated roster that WON', () => {
    const a = run([...carried, ...shared]).get('one_man_army')!
    expect(a.teamId).toBe(1)
    expect(a.metricValue).toBe('80%')
    expect(a.player?.name).toBe('The Guy')
  })

  it('never gives The One Man Army to a team that lost', () => {
    // The regression this restriction exists for. Unrestricted, a share of
    // team total lands on the LOWEST scorer in the league every week — week 1
    // would have handed it to the manager who already had The Dumpster Fire
    // and The Public Execution.
    //
    // Team 2 lost 60-150 and is the most concentrated roster on the board
    // here, and still does not win it.
    const lopsidedLoser = [
      sh(2, 25, 'Lone Hero', 55, 20), sh(2, 26, 'Nobody A', 3, 10),
      sh(2, 27, 'Nobody B', 2, 10),
    ]
    const a = run(lopsidedLoser).get('one_man_army')
    expect(a).toBeUndefined()
  })

  it('gives The Socialist to the highest FLOOR, not the flattest percentage', () => {
    // Team 2's worst starter scored 25; team 1's scored 3.
    const a = run([...carried, ...shared]).get('socialist')!
    expect(a.teamId).toBe(2)
    expect(a.metricValue).toBe('25.0')
  })

  it('is not decided by how much a team scored', () => {
    // Team 3 scores twice as much as team 2 with a WORSE floor, and still
    // loses the award. Share of team total got this backwards: it correlated
    // -0.64 with the total, so the Socialist went to whoever scored most.
    const richButHollow = [
      sh(3, 31, 'Big A', 90, 40), sh(3, 32, 'Big B', 90, 40),
      sh(3, 33, 'Quiet One', 4, 12),
    ]
    const a = run([...shared, ...richButHollow]).get('socialist')!
    expect(a.teamId).toBe(2)
  })

  it('is omitted when every roster had somebody score nothing', () => {
    const allHoles = [
      sh(4, 41, 'Fine', 30, 20), sh(4, 42, 'Zero', 0, 11),
      sh(5, 51, 'Fine Too', 28, 20), sh(5, 52, 'Also Zero', 0, 9),
    ]
    expect(run(allHoles).has('socialist')).toBe(false)
  })

  it('never gives one manager both awards', () => {
    const only = run(carried)
    expect(only.get('one_man_army')?.teamId).toBe(1)
    expect(only.has('socialist')).toBe(false)
  })

  it('skips a team whose starters scored nothing rather than dividing by zero', () => {
    const blanked = [sh(9, 91, 'Ghost', 0, 12), sh(9, 92, 'Ghost Two', 0, 11)]
    const keys = run([...carried, ...shared, ...blanked])
    expect(keys.get('one_man_army')?.teamId).toBe(1)
    expect(keys.get('socialist')?.teamId).toBe(2)
  })

  describe('The Control Group', () => {
    it('rewards the team closest to its own projection, high or low', () => {
      // Team 2 scored 100 against 120 projected: 20 off.
      // Team 4 scored 100 against 102 projected: 2 off, and wins.
      const precise = [
        sh(4, 41, 'Exactly A', 50, 51), sh(4, 42, 'Exactly B', 50, 51),
      ]
      const a = run([...carried, ...shared, ...precise]).get('control_group')!
      expect(a.teamId).toBe(4)
      expect(a.metricValue).toBe('2.0')
    })

    it('does not care which side of the projection a team landed on', () => {
      const under = [sh(5, 51, 'Under', 47, 50)]
      const over = [sh(6, 61, 'Over', 53, 50)]
      // Both are 3 off. The tie breaks on team id, deterministically.
      const a = run([...carried, ...under, ...over]).get('control_group')!
      expect(a.teamId).toBe(5)
    })
  })

  describe('Slay Girl Slay', () => {
    it('counts starters who cleared their own projection', () => {
      // Team 1 has exactly ONE starter over (the fillers land on their number),
      // team 2 has none, so neither qualifies. Team 8 has three.
      const slayed = [
        sh(8, 81, 'Over A', 20, 12), sh(8, 82, 'Over B', 18, 11),
        sh(8, 83, 'Over C', 15, 14), sh(8, 84, 'Under', 2, 9),
      ]
      const a = run([...carried, ...shared, ...slayed]).get('slay_girl_slay')!
      expect(a.teamId).toBe(8)
      expect(a.metricValue).toBe('3')
    })

    it('breaks a tie on how much was cleared, not on who is first', () => {
      const byTwo = [sh(8, 81, 'A', 20, 12), sh(8, 82, 'B', 18, 11)]      // +15
      const byMore = [sh(9, 91, 'C', 40, 12), sh(9, 92, 'D', 38, 11)]     // +55
      const a = run([...byTwo, ...byMore]).get('slay_girl_slay')!
      expect(a.teamId).toBe(9)
    })

    it('is omitted when nobody managed more than one overperformer', () => {
      // One lucky starter is not a lineup that slayed.
      const barely = [sh(7, 71, 'Lone Star', 30, 10), sh(7, 72, 'Flop', 1, 20)]
      expect(run(barely).has('slay_girl_slay')).toBe(false)
    })
  })

  describe('The Understudy', () => {
    it('finds the best week from a bench', () => {
      const withBench = [
        ...carried,
        sh(2, 29, 'Should Have Played', 44, 12, false),
      ]
      const a = run(withBench).get('understudy')!
      expect(a.teamId).toBe(2)
      expect(a.metricValue).toBe('44.0')
      expect(a.player?.name).toBe('Should Have Played')
    })

    it('ignores a player on injured reserve', () => {
      // He could not legally have been started, so leaving him there was not
      // a decision anybody made.
      const stashed = [
        ...carried,
        { ...sh(2, 28, 'On IR', 99, 20, false), lineupSlotId: 21 },
      ]
      expect(run(stashed).get('understudy')?.player?.name).not.toBe('On IR')
    })

    it('is omitted when every bench scored nothing', () => {
      const quiet = [...carried, sh(2, 27, 'Also Nothing', 0, 9, false)]
      expect(run(quiet).has('understudy')).toBe(false)
    })
  })
})

describe('matchup-shape awards', () => {
  const run = (m: AwardMatchup[], snapshots: { matchupId: number; homeScore: number; awayScore: number }[] = []) =>
    new Map(computeWeeklyAwards(m, 1, [], [], {}, snapshots).map((a) => [a.key as string, a]))

  describe('The Photo Finish', () => {
    it('goes to the narrowest win, not the highest score', () => {
      // week1 game 2 is t3 101.0 over t4 100.5 — half a point.
      const a = run(week1).get('photo_finish')!
      expect(a.teamId).toBe(3)
      expect(a.opponentId).toBe(4)
      expect(a.metricValue).toBe('0.5')
    })
  })

  describe("Sweatin' It Out", () => {
    it('measures the biggest deficit a winner ever faced', () => {
      // t1 won 150-60 but was 40 behind at one point.
      const snaps = [
        { matchupId: 1, homeScore: 10, awayScore: 50 },
        { matchupId: 1, homeScore: 90, awayScore: 55 },
        { matchupId: 1, homeScore: 150, awayScore: 60 },
      ]
      const a = run(week1, snaps).get('sweatin_it_out')!
      expect(a.teamId).toBe(1)
      expect(a.metricValue).toBe('40.0')
    })

    it('reads the deficit from the winner’s own side of the matchup', () => {
      // Game 3: t5 120, t6 130 — the AWAY team won. A snapshot where home led
      // by 25 is a 25-point deficit for t6, not a lead.
      const snaps = [{ matchupId: 3, homeScore: 80, awayScore: 55 }]
      const a = run(week1, snaps).get('sweatin_it_out')!
      expect(a.teamId).toBe(6)
      expect(a.metricValue).toBe('25.0')
    })

    it('is omitted when every winner led wire to wire', () => {
      const snaps = [
        { matchupId: 1, homeScore: 30, awayScore: 5 },
        { matchupId: 1, homeScore: 150, awayScore: 60 },
      ]
      expect(run(week1, snaps).has('sweatin_it_out')).toBe(false)
    })

    it('is omitted entirely when no snapshots were captured', () => {
      // A week before continuous capture existed has no comeback story, and
      // inventing one from the final score would be a guess.
      expect(run(week1).has('sweatin_it_out')).toBe(false)
    })
  })
})

describe('The Free Fall', () => {
  const run = (movement: Map<number, number>) =>
    new Map(
      computeWeeklyAwards(week1, 1, [], [], {}, [], movement).map((a) => [a.key as string, a]),
    )

  it('goes to the biggest drop down the table', () => {
    // t1 gained two, t5 lost one, t7 lost four.
    const a = run(new Map([[1, 2], [5, -1], [7, -4]])).get('free_fall')!
    expect(a.teamId).toBe(7)
    expect(a.metricValue).toBe('4')
  })

  it('ignores teams that climbed or held station', () => {
    expect(run(new Map([[1, 3], [3, 0]])).has('free_fall')).toBe(false)
  })

  it('cannot exist in week 1, which has no table to fall from', () => {
    // computeMovement returns an empty map before week 2, and inventing a
    // starting rank to fall from would be a fabricated number.
    expect(run(new Map()).has('free_fall')).toBe(false)
  })

  it('names the opponent it happened against', () => {
    const a = run(new Map([[5, -3]])).get('free_fall')!
    expect(a.opponentId).toBe(6)
  })

  it('says place, not places, for a single spot', () => {
    expect(run(new Map([[5, -1]])).get('free_fall')!.headline).toMatch(/1 place\b/)
  })
})

describe('commentary never assumes a manager’s gender', () => {
  // A template cannot know who will win. "of exactly what he was projected to
  // score" shipped to production under Bree Noble's name, which is exactly the
  // failure this guard exists to stop repeating.
  //
  // NFL players are the deliberate exception: that pool is all men, so "he
  // went off for 13.5" about a receiver is accurate rather than assumed. The
  // check therefore runs only on awards whose card shows no player.
  const GENDERED = /\b(he|him|his|she|her|hers)\b/i

  const context = {
    managerFirst: 'Bree',
    teamName: 'Bree’s Badass Boys',
    opponentTeam: 'Dad Bod',
    opponentManager: 'Jay Clouse',
    value: '12.3',
  }

  for (const def of AWARDS.filter((a) => a.evidence !== 'PLAYER' && !a.player)) {
    it(`${def.name} refers to its winner without a gendered pronoun`, () => {
      const text = buildCommentary(def.key, context).map((s) => s.text).join('')
      const hit = text.match(GENDERED)
      expect(hit, `${def.name}: "${text}"`).toBeNull()
    })
  }

  it('still allows a gendered pronoun for an NFL player', () => {
    // The guard must not be so broad that it flattens real copy about a real
    // person whose pronouns are not in question.
    const text = buildCommentary('nostradamus', {
      ...context, playerName: 'Caleb Williams', playerMeta: 'QB · CHI',
    }).map((s) => s.text).join('')
    expect(text).toMatch(/started him anyway/)
  })

  it('falls back to a neutral phrase when there is no player or opponent', () => {
    const bare = buildCommentary('nostradamus', { ...context, playerName: null })
      .map((s) => s.text).join('')
    expect(bare).not.toMatch(/\bhis flex\b/)
  })
})

describe('The Mastermind is not about bench points', () => {
  const QB = 0, RB = 2, WR = 4, BE = 20
  const SLOTS = { [QB]: 1, [RB]: 1, [WR]: 1, [BE]: 5 }

  const p = (
    teamId: number, id: number, name: string, slot: number,
    points: number, eligibleSlots: number[],
  ): AwardPlayer => ({
    seasonTeamId: teamId, espnPlayerId: id, name, position: 'RB', nflTeam: 'DAL',
    isStarter: slot !== BE, lineupSlotId: slot, eligibleSlots,
    actualPoints: points, projectedPoints: 10,
  })

  it('gives a zero gap to a manager whose bench scored plenty', () => {
    // The case that exposed the wrong copy. Doug's bench scored over twenty
    // points in week 1 and his gap was still genuinely zero: none of those
    // players was eligible for a slot where they would have outscored the
    // starter in it. "Left the fewest points on the bench" was a lie about
    // this exact roster.
    const team = [
      p(1, 11, 'QB1', QB, 25, [QB]),
      p(1, 12, 'RB1', RB, 20, [RB]),
      p(1, 13, 'WR1', WR, 18, [WR]),
      // A 22-point bench, none of it reachable: this player can only fill QB,
      // and the QB already in the lineup outscored him.
      p(1, 14, 'Backup QB', BE, 22, [QB]),
    ]
    // A rival who genuinely left points behind, so the award has competition.
    const rival = [
      p(2, 21, 'QB1', QB, 15, [QB]),
      p(2, 22, 'RB1', RB, 4, [RB]),
      p(2, 23, 'WR1', WR, 9, [WR]),
      p(2, 24, 'Benched Star', BE, 30, [RB]),
    ]

    const out = new Map(
      computeWeeklyAwards(week1, 1, [...team, ...rival], [], SLOTS, []).map((a) => [a.key as string, a]),
    )
    const mastermind = out.get('mastermind')!
    expect(mastermind.teamId).toBe(1)
    expect(mastermind.metricValue).toBe('0.0')

    // And the loser of the same measure is the one who really did leave points.
    expect(out.get('bench_bum')!.teamId).toBe(2)
    expect(out.get('bench_bum')!.metricValue).toBe('26.0')
  })

  it('says "additional" rather than claiming the bench total', () => {
    const zero = buildCommentary('mastermind', { managerFirst: 'Doug', teamName: 'X', value: '0.0' })
      .map((s) => s.text).join('')
    expect(zero).toMatch(/optimal lineup outright/)
    expect(zero).not.toMatch(/left just 0\.0 points on the bench/)

    const some = buildCommentary('mastermind', { managerFirst: 'Doug', teamName: 'X', value: '1.9' })
      .map((s) => s.text).join('')
    expect(some).toMatch(/1\.9 additional points/)
  })

  it('shows the best possible lineup above the actual one', () => {
    const team = [
      p(1, 11, 'QB1', QB, 25, [QB]),
      p(1, 12, 'RB1', RB, 4, [RB]),
      p(1, 13, 'WR1', WR, 9, [WR]),
      p(1, 14, 'Benched', BE, 30, [RB]),
    ]
    const a = computeWeeklyAwards(week1, 1, team, [], SLOTS, [])
      .find((x) => x.key === 'mastermind')!
    expect(a.supporting[0].label).toBe('Best possible')
    expect(a.supporting[1].label).toBe('Actual lineup')
  })
})

describe('The Waiver Wire Wizard notices a benched pickup', () => {
  const ctx = {
    managerFirst: 'Colin', teamName: 'Nix Pix a Puka Six',
    playerName: 'Stefon Diggs', playerMeta: 'WR · WSH', value: '13.5',
  }
  const render = (extra?: Record<string, string>) =>
    buildCommentary('waiver_wire_wizard', { ...ctx, extra }).map((s) => s.text).join('')

  it('needles a manager who found him and then sat him', () => {
    // The award is won for the acquisition, so it does not require a start —
    // but claiming a manager "went off for 13.5" reads as a compliment he did
    // not earn when the points happened without him.
    const text = render({ Lineup: 'Benched' })
    expect(text).toMatch(/from the bench/)
    expect(text).not.toMatch(/Slay, king/)
  })

  it('leaves the compliment intact when he actually started him', () => {
    expect(render({ Lineup: 'Started' })).toMatch(/Slay, king/)
  })

  it('falls back to the compliment when the detail is missing', () => {
    // An older published week has no `Lineup` in its stored supporting stats.
    // Silence is not evidence he benched the guy.
    expect(render()).toMatch(/Slay, king/)
  })
})

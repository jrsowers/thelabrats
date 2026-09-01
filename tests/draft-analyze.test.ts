import { describe, it, expect } from 'vitest'
import { analyzeDraft, selectRoastable } from '../src/lib/draft/analyze'
import type { DraftablePlayer, RawPick, TeamMeta } from '../src/lib/draft/types'

const P = (
  id: number, name: string, pos: DraftablePlayer['pos'],
  leagueRank: number, adp: number, injuryStatus: string | null = null,
): DraftablePlayer => ({ id, name, pos, proTeam: 'XX', leagueRank, adp, injuryStatus })

const T = (teamId: number, managerFirst: string): TeamMeta =>
  ({ teamId, teamName: `${managerFirst}'s Team`, manager: `${managerFirst} X`, managerFirst })

const pick = (overall: number, teamId: number, playerId: number, over = {}): RawPick => ({
  overallPickNumber: overall,
  roundId: Math.floor((overall - 1) / 2) + 1,
  roundPickNumber: ((overall - 1) % 2) + 1,
  teamId, playerId, keeper: false, autoDraftTypeId: 0, ...over,
})

const teams = new Map([[1, T(1, 'Ada')], [2, T(2, 'Bo')]])

/** 60 ranked RBs, so "how many better were available" is a real number. */
function board(extra: DraftablePlayer[] = []) {
  const m = new Map<number, DraftablePlayer>()
  for (let i = 1; i <= 60; i++) m.set(i, P(i, `Rank ${i}`, 'RB', i, i))
  for (const p of extra) m.set(p.id, p)
  return m
}

describe('reach and value are measured against the SUPERFLEX board', () => {
  // The whole point: Josh Allen's standard ADP is 19.4 but he is superflex #1.
  // Taking him first overall is correct, not an 18-slot reach.
  const players = new Map([
    [10, P(10, 'Josh Allen', 'QB', 1, 19.4)],
    [11, P(11, 'Jahmyr Gibbs', 'RB', 7, 1.34)],
    [12, P(12, 'Faller', 'WR', 5, 5)],
  ])

  const result = analyzeDraft({
    picks: [pick(1, 1, 10), pick(2, 2, 11)],
    playersById: players, teamsById: teams, totalRounds: 15,
  })

  it('does not flag a correct superflex QB pick as a reach', () => {
    const allen = result[0]
    expect(allen.reachSlots).toBe(0)
    expect(allen.flags).not.toContain('REACH')
    expect(allen.flags).not.toContain('MASSIVE_REACH')
  })

  it('still exposes the standard-ADP gap as colour', () => {
    // Taken 18.4 slots earlier than the rest of America had him.
    expect(result[0].adpSlots).toBe(18.4)
  })

  it('reads a player who falls past his rank as value', () => {
    const r = analyzeDraft({
      picks: [pick(30, 1, 12)], // superflex rank 5, still there at pick 30
      playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.reachSlots).toBe(-25)
    expect(r.flags).toContain('MASSIVE_VALUE')
    expect(r.flags).not.toContain('MASSIVE_REACH')
  })
})

describe('the sign of reachSlots', () => {
  // Regression guard. This was inverted once: `pick - rank` reads a massive
  // reach as value and would have had the bot calling every reach a steal.
  const players = new Map([
    [1, P(1, 'Went Way Too Early', 'QB', 40, 80)],
    [2, P(2, 'Fell Way Too Far', 'RB', 5, 5)],
  ])

  it('taking a low-ranked player early is POSITIVE (a reach)', () => {
    const r = analyzeDraft({
      picks: [pick(1, 1, 1)], playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.reachSlots).toBe(39)
    expect(r.reachSlots).toBeGreaterThan(0)
  })

  it('flags a reach by how many better players were sitting there', () => {
    // Rank 500 taken first overall, with 60 better players on the board.
    const b = board([P(999, 'Way Too Early', 'QB', 500, 500)])
    const r = analyzeDraft({
      picks: [pick(1, 1, 999)], playersById: b, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.betterAvailable).toBe(60)
    expect(r.flags).toContain('MASSIVE_REACH')
    expect(r.flags).toContain('PASSED_ON_STUD')
  })

  it('taking the best player left is not a reach at all', () => {
    const r = analyzeDraft({
      picks: [pick(1, 1, 1)], playersById: board(), teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.betterAvailable).toBe(0)
    expect(r.flags).toContain('BEST_AVAILABLE')
    expect(r.bestAvailable).toBeNull()
  })

  it('stays honest deep in the draft, where every rank exceeds the pick', () => {
    // Round 9 of a drained board: rank-minus-pick would call this a huge reach.
    // Only two better players remain, so it is not one.
    const b = new Map([
      [1, P(1, 'Best Left', 'RB', 120, 120)],
      [2, P(2, 'Next Left', 'RB', 121, 121)],
      [3, P(3, 'Taken', 'RB', 122, 122)],
    ])
    const r = analyzeDraft({
      picks: [{ ...pick(101, 1, 3), roundId: 9 }],
      playersById: b, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.betterAvailable).toBe(2)
    expect(r.flags).not.toContain('MASSIVE_REACH')
    expect(r.flags).not.toContain('REACH')
  })

  it('getting a high-ranked player late is NEGATIVE (value)', () => {
    const r = analyzeDraft({
      picks: [pick(40, 1, 2)], playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.reachSlots).toBe(-35)
    expect(r.reachSlots).toBeLessThan(0)
    expect(r.flags).toContain('MASSIVE_VALUE')
  })
})

describe('reaches', () => {
  const players = new Map([
    [1, P(1, 'Stud RB', 'RB', 2, 2)],
    [2, P(2, 'Stud WR', 'WR', 3, 3)],
    [3, P(3, 'Jaxson Dart', 'QB', 40, 82.8)],
  ])

  const result = analyzeDraft({
    picks: [pick(1, 1, 3)], // took rank 40 at pick 1
    playersById: players, teamsById: teams, totalRounds: 15,
  })

  it('computes the reach against superflex rank', () => {
    // Rank 40 taken first overall = reached 39 slots.
    expect(result[0].reachSlots).toBe(39)
  })

  it('names who was still on the board', () => {
    const r = analyzeDraft({
      picks: [pick(10, 1, 3)],
      playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.reachSlots).toBe(30)
    expect(r.bestAvailable?.name).toBe('Stud RB')
  })
})

describe('passing on a better player', () => {
  const players = new Map([
    [1, P(1, 'Elite Back', 'RB', 1, 1)],
    [2, P(2, 'Mediocre TE', 'TE', 60, 70)],
  ])
  const r = analyzeDraft({
    picks: [pick(30, 1, 2)], // pick 30, took rank 60, rank 1 still there
    playersById: players, teamsById: teams, totalRounds: 15,
  })[0]

  it('flags it and names the player passed over', () => {
    expect(r.reachSlots).toBe(30)
    expect(r.bestAvailable?.name).toBe('Elite Back')
    expect(r.passedOver.map((p) => p.name)).toContain('Elite Back')
  })
})

describe('kickers and defences', () => {
  const players = new Map([
    [1, P(1, 'A Kicker', 'K', 170, 170)],
    [2, P(2, 'A Defence', 'DST', 160, 160)],
    [3, P(3, 'A Back', 'RB', 5, 5)],
  ])

  it('an early kicker is the most roastable thing in the draft', () => {
    const r = analyzeDraft({
      picks: [pick(20, 1, 1)],
      playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.flags).toContain('EARLY_KICKER')
    expect(r.flags).toContain('FIRST_KICKER')
    // Comfortably over the roastable bar without needing a reach to help it.
    expect(r.notability).toBeGreaterThanOrEqual(45)
  })

  it('a last-round kicker is left alone', () => {
    const late = { ...pick(178, 1, 1), roundId: 15 }
    const r = analyzeDraft({
      picks: [late], playersById: players, teamsById: teams, totalRounds: 15,
    })[0]
    expect(r.flags).not.toContain('EARLY_KICKER')
    expect(r.notability).toBeLessThan(60)
  })
})

describe('superflex QB neglect', () => {
  const players = new Map([
    [1, P(1, 'WR One', 'WR', 10, 10)],
    [2, P(2, 'WR Two', 'WR', 20, 20)],
    [3, P(3, 'WR Three', 'WR', 30, 30)],
  ])
  it('flags a team with no QBs deep into the draft', () => {
    const picks = [
      { ...pick(1, 1, 1), roundId: 1 },
      { ...pick(2, 1, 2), roundId: 8 },
      { ...pick(3, 1, 3), roundId: 9 },
    ]
    const r = analyzeDraft({ picks, playersById: players, teamsById: teams, totalRounds: 15 })
    expect(r[0].flags).not.toContain('NO_QB_LATE')
    expect(r[1].flags).toContain('NO_QB_LATE')
    expect(r[2].flags).toContain('NO_QB_LATE')
  })
})

describe('position runs', () => {
  it('counts same-position picks in the preceding window', () => {
    const players = new Map(
      [1, 2, 3, 4].map((i) => [i, P(i, `RB ${i}`, 'RB', i, i)] as const),
    )
    const picks = [1, 2, 3, 4].map((i) => pick(i, (i % 2) + 1, i))
    const r = analyzeDraft({ picks, playersById: players, teamsById: teams, totalRounds: 15 })
    expect(r[0].positionRun).toBe(0)
    expect(r[3].positionRun).toBe(3)
    expect(r[3].flags).toContain('POSITION_RUN')
  })
})

describe('selectRoastable', () => {
  const players = new Map(
    Array.from({ length: 80 }, (_, i) => [i + 1, P(i + 1, `P${i + 1}`, 'RB', i + 1, i + 1)] as const),
  )
  // Four teams, 60 picks, deliberately messy so notability varies.
  const four = new Map([[1, T(1, 'Ada')], [2, T(2, 'Bo')], [3, T(3, 'Cy')], [4, T(4, 'Di')]])
  const picks = Array.from({ length: 60 }, (_, i) =>
    pick(i + 1, (i % 4) + 1, ((i * 7) % 80) + 1))
  const all = analyzeDraft({ picks, playersById: players, teamsById: four, totalRounds: 15 })

  it('keeps the draft to a readable number of comments', () => {
    const hot = selectRoastable(all)
    expect(hot.length).toBeLessThan(all.length)
  })

  it('never pile-drives one manager', () => {
    const hot = selectRoastable(all, { maxPerTeam: 2 })
    const counts = new Map<number, number>()
    for (const p of hot) counts.set(p.team.teamId, (counts.get(p.team.teamId) ?? 0) + 1)
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2)
  })

  it('leaves nobody out — being ignored is worse than being roasted', () => {
    const hot = selectRoastable(all, { minNotability: 999, guaranteeEveryTeam: true })
    expect(new Set(hot.map((p) => p.team.teamId)).size).toBe(4)
  })

  it('returns picks in draft order, not by score', () => {
    const hot = selectRoastable(all)
    const nums = hot.map((p) => p.overallPickNumber)
    expect(nums).toEqual([...nums].sort((a, b) => a - b))
  })
})

describe('unmade picks', () => {
  const players = new Map([
    [1, P(1, 'Real Guy', 'RB', 1, 1)],
    [-16026, P(-16026, 'Seahawks D/ST', 'DST', 150, 150)],
  ])

  it('ignores placeholder picks so a live draft analyses cleanly', () => {
    const picks = [pick(1, 1, 1), pick(2, 2, -1), pick(3, 1, -1)]
    const r = analyzeDraft({ picks, playersById: players, teamsById: teams, totalRounds: 15 })
    expect(r).toHaveLength(1)
    expect(r[0].player.name).toBe('Real Guy')
  })

  it('keeps D/ST picks, whose ESPN ids are negative', () => {
    // Regression guard. Filtering on `playerId > 0` looks right and silently
    // drops all twelve defences, because Seahawks D/ST is id -16026.
    const picks = [pick(1, 1, 1), pick(2, 2, -16026), pick(3, 1, -1)]
    const r = analyzeDraft({ picks, playersById: players, teamsById: teams, totalRounds: 15 })
    expect(r).toHaveLength(2)
    expect(r.map((x) => x.player.name)).toContain('Seahawks D/ST')
  })
})

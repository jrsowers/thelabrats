/**
 * Bracket construction tests (§21.8). Nothing here may hardcode six teams —
 * the spec is explicit that playoff team count is configuration (§21.3).
 */
import { describe, it, expect } from 'vitest'
import { buildBracket, type Seed } from '@/lib/playoffs/bracket'

const seeds = (n: number): Seed[] =>
  Array.from({ length: n }, (_, i) => ({ seed: i + 1, seasonTeamId: 100 + i }))

describe('buildBracket — this league (6 teams, week 14)', () => {
  const rounds = buildBracket(seeds(6), 6, 14)

  it('produces three rounds ending in a championship', () => {
    expect(rounds).toHaveLength(3)
    expect(rounds.map((r) => r.name)).toEqual(['Quarterfinals', 'Semifinals', 'Championship'])
  })

  it('gives the top two seeds a bye', () => {
    expect(rounds[0].byes.map((b) => b.seed)).toEqual([1, 2])
    expect(rounds[1].byes).toHaveLength(0)
  })

  it('pairs 3v6 and 4v5 in the opening round', () => {
    expect(rounds[0].games.map((g) => g.label)).toEqual(['3 vs 6', '4 vs 5'])
  })

  it('runs consecutive weeks from the given start', () => {
    expect(rounds.map((r) => r.week)).toEqual([14, 15, 16])
  })

  it('describes unknown participants instead of leaving them blank', () => {
    const semis = rounds[1].games
    const placeholders = semis.flatMap((g) =>
      [g.home, g.away].filter((s) => s.seasonTeamId === null).map((s) => s.placeholder),
    )
    expect(placeholders.every((p) => typeof p === 'string' && p.length > 0)).toBe(true)
  })

  it('seats both bye teams in the semifinals', () => {
    const seated = rounds[1].games
      .flatMap((g) => [g.home, g.away])
      .filter((s) => s.seed !== null)
      .map((s) => s.seed)
    expect(seated.sort()).toEqual([1, 2])
  })

  it('narrows to a single championship game', () => {
    expect(rounds[2].games).toHaveLength(1)
  })
})

describe('buildBracket — other configurations', () => {
  it('handles a power-of-two field with no byes', () => {
    const rounds = buildBracket(seeds(4), 4, 14)
    expect(rounds).toHaveLength(2)
    expect(rounds[0].byes).toHaveLength(0)
    expect(rounds[0].games.map((g) => g.label)).toEqual(['1 vs 4', '2 vs 3'])
  })

  it('handles eight teams', () => {
    const rounds = buildBracket(seeds(8), 8, 14)
    expect(rounds).toHaveLength(3)
    expect(rounds[0].games).toHaveLength(4)
    expect(rounds[0].games.map((g) => g.label)).toEqual(['1 vs 8', '2 vs 7', '3 vs 6', '4 vs 5'])
  })

  it('gives four byes to a five-team field', () => {
    // 5 teams pad to 8, so seeds 1-3 rest and 4 plays 5.
    const rounds = buildBracket(seeds(5), 5, 14)
    expect(rounds[0].byes.map((b) => b.seed)).toEqual([1, 2, 3])
    expect(rounds[0].games.map((g) => g.label)).toEqual(['4 vs 5'])
  })

  it('ignores seeds beyond the playoff field', () => {
    const rounds = buildBracket(seeds(12), 6, 14)
    const ids = rounds[0].games.flatMap((g) => [g.home.seed, g.away.seed])
    expect(Math.max(...(ids.filter(Boolean) as number[]))).toBeLessThanOrEqual(6)
  })

  it('returns nothing when there are no seeds', () => {
    expect(buildBracket([], 6, 14)).toEqual([])
  })
})

describe('buildBracket — rounds that span more than one week', () => {
  // This league's real shape: ESPN reports playoffMatchupPeriodLengthByRound
  // as { 1: 1, 2: 1, 3: 2 } — the championship runs weeks 16 and 17.
  const rounds = buildBracket(seeds(6), 6, 14, { 1: 1, 2: 1, 3: 2 })

  it('starts each round after the previous one has had all its weeks', () => {
    expect(rounds.map((r) => r.week)).toEqual([14, 15, 16])
  })

  it('reports the last week of a multi-week round', () => {
    expect(rounds.map((r) => r.weekEnd)).toEqual([14, 15, 17])
  })

  it('pushes later rounds back when an early round is long', () => {
    const long = buildBracket(seeds(6), 6, 14, { 1: 2 })
    expect(long.map((r) => r.week)).toEqual([14, 16, 17])
    expect(long[0].weekEnd).toBe(15)
  })

  it('carries the span onto the games, not just the round', () => {
    const final = rounds[2].games[0]
    expect([final.week, final.weekEnd]).toEqual([16, 17])
  })

  it('treats a missing, zero or absent round length as one week', () => {
    expect(buildBracket(seeds(6), 6, 14, {}).map((r) => r.week)).toEqual([14, 15, 16])
    expect(buildBracket(seeds(6), 6, 14, { 1: 0 }).map((r) => r.week)).toEqual([14, 15, 16])
  })

  it('accepts the string keys ESPN actually sends in JSON', () => {
    const fromJson = buildBracket(seeds(6), 6, 14, { '1': 1, '2': 1, '3': 2 })
    expect(fromJson.map((r) => r.weekEnd)).toEqual([14, 15, 17])
  })
})

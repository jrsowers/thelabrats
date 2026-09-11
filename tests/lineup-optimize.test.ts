/**
 * Lineup optimizer tests.
 *
 * This number IS two awards. If it is wrong, The Mastermind and The Bench Bum
 * are wrong, and nobody can tell by looking — a plausible "12.4 points left on
 * the bench" is indistinguishable from a correct one.
 *
 * So the centrepiece here is a cross-check against a second, independent exact
 * solver — a bitmask DP that is obviously correct and far too slow to ship —
 * run over hundreds of random rosters. That is the only test that can catch a
 * subtly wrong matching.
 */
import { describe, it, expect } from 'vitest'
import {
  optimalLineup, startingSeats, pointsLeftOnBench, type OptimizerPlayer,
} from '@/lib/lineup/optimize'
import { NON_STARTER_SLOTS } from '@/lib/espn/constants'

const QB = 0, RB = 2, WR = 4, TE = 6, OP = 7, DST = 16, K = 17, FLEX = 23

const p = (
  espnPlayerId: number, name: string, points: number, eligibleSlots: number[],
): OptimizerPlayer => ({ espnPlayerId, name, points, eligibleSlots })

/**
 * An INDEPENDENT exact solver: dynamic programming over seats, with a bitmask
 * of players already used.
 *
 * Deliberately a different algorithm from the one under test — a second
 * Hungarian implementation would share any misconception the first had. This
 * one is obviously correct at a glance and merely too slow to ship: it visits
 * every subset of players, which is fine at a dozen and hopeless at fifty.
 */
function exhaustive(players: OptimizerPlayer[], seats: number[]): number {
  const n = players.length
  if (n > 20) throw new Error('exhaustive check would not finish')
  const size = 1 << n
  // best[mask] = most points obtainable having already used `mask`, at the
  // current seat. Rolled forward one seat at a time.
  let best = new Float64Array(size).fill(-Infinity)
  best[0] = 0

  for (const slotId of seats) {
    const next = new Float64Array(size).fill(-Infinity)
    for (let mask = 0; mask < size; mask++) {
      const here = best[mask]
      if (here === -Infinity) continue
      // Leaving the seat empty is always legal — a short roster must not fail.
      if (here > next[mask]) next[mask] = here
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) continue
        if (!players[i].eligibleSlots.includes(slotId)) continue
        const m2 = mask | (1 << i)
        const value = here + players[i].points
        if (value > next[m2]) next[m2] = value
      }
    }
    best = next
  }

  let out = 0
  for (let mask = 0; mask < size; mask++) if (best[mask] > out) out = best[mask]
  return out
}

describe('startingSeats', () => {
  it('expands slot counts into one seat per startable spot', () => {
    const seats = startingSeats({ 0: 1, 2: 2, 4: 2, 23: 1 }, NON_STARTER_SLOTS)
    expect(seats).toEqual([QB, RB, RB, WR, WR, FLEX])
  })

  it('excludes bench and IR, which are not startable', () => {
    const seats = startingSeats({ 0: 1, 20: 5, 21: 2 }, NON_STARTER_SLOTS)
    expect(seats).toEqual([QB])
  })

  it('matches this league: ten starters', () => {
    // The real lineup_slot_counts from ESPN.
    const seats = startingSeats(
      { 0: 1, 2: 2, 4: 2, 6: 1, 7: 1, 16: 1, 17: 1, 20: 5, 21: 2, 23: 1 },
      NON_STARTER_SLOTS,
    )
    expect(seats).toHaveLength(10)
  })
})

describe('optimalLineup', () => {
  it('fills each seat with an eligible player', () => {
    const seats = [QB, RB, WR]
    const roster = [
      p(1, 'Passer', 25, [QB, OP]),
      p(2, 'Runner', 18, [RB, FLEX, OP]),
      p(3, 'Catcher', 12, [WR, FLEX, OP]),
    ]
    const out = optimalLineup(roster, seats)
    expect(out.total).toBe(55)
    expect(out.unfilled).toEqual([])
  })

  it('beats the greedy answer where greedy is wrong', () => {
    // Greedy takes the highest scorer first and puts him in a slot only he can
    // fill, stranding the seat the next player needed.
    //
    //   seats: QB, OP
    //   Elite QB    30   QB, OP
    //   Backup QB   28   QB, OP
    //   Star RB     26   RB, FLEX, OP      <- OP is his ONLY seat here
    //
    // Best is 58 (both QBs). A greedy pass that prefers the "most specific"
    // seat puts Elite in QB, Backup in OP, and never considers the RB — which
    // happens to be right. Reverse the preference and it takes Elite + Star for
    // 56. The optimizer does not depend on which heuristic anyone picked.
    const seats = [QB, OP]
    const roster = [
      p(1, 'Elite QB', 30, [QB, OP]),
      p(2, 'Backup QB', 28, [QB, OP]),
      p(3, 'Star RB', 26, [RB, FLEX, OP]),
    ]
    const out = optimalLineup(roster, seats)
    expect(out.total).toBe(58)
    expect(exhaustive(roster, seats)).toBe(58)
  })

  it('strands nobody when the best player blocks a scarce seat', () => {
    // The classic failure: one WR seat and one FLEX. The 30-point WR belongs in
    // WR, not FLEX, or the 20-point RB has nowhere to go.
    const seats = [WR, FLEX]
    const roster = [
      p(1, 'Big WR', 30, [WR, FLEX, OP]),
      p(2, 'Solid RB', 20, [RB, FLEX, OP]),
    ]
    const out = optimalLineup(roster, seats)
    expect(out.total).toBe(50)
    expect(out.assignments.find((a) => a.slotId === WR)?.player.name).toBe('Big WR')
  })

  it('leaves a seat empty rather than inventing an illegal start', () => {
    // No kicker on the roster. The K seat stays open; it does not get filled by
    // a running back because one was available.
    const seats = [QB, K]
    const roster = [p(1, 'Passer', 25, [QB, OP]), p(2, 'Runner', 40, [RB, FLEX])]
    const out = optimalLineup(roster, seats)
    expect(out.total).toBe(25)
    expect(out.unfilled).toEqual([K])
  })

  it('never starts the same player twice', () => {
    const seats = [FLEX, OP]
    const roster = [p(1, 'Only Man', 22, [RB, FLEX, OP])]
    const out = optimalLineup(roster, seats)
    expect(out.total).toBe(22)
    expect(out.assignments).toHaveLength(1)
  })

  it('handles an empty roster and an empty lineup', () => {
    expect(optimalLineup([], [QB, RB]).total).toBe(0)
    expect(optimalLineup([], [QB, RB]).unfilled).toEqual([QB, RB])
    expect(optimalLineup([p(1, 'X', 10, [QB])], []).total).toBe(0)
  })

  it('is deterministic when two players tie', () => {
    const seats = [FLEX]
    const roster = [p(9, 'Later Id', 15, [FLEX]), p(2, 'Earlier Id', 15, [FLEX])]
    const first = optimalLineup(roster, seats)
    const second = optimalLineup([...roster].reverse(), seats)
    expect(first.assignments[0].player.espnPlayerId).toBe(2)
    expect(second.assignments[0].player.espnPlayerId).toBe(2)
  })

  it('treats a zero-scoring player as startable, not as absent', () => {
    // A player who scored nothing still legally occupies a seat, and on a
    // finished week that is exactly what "no stat line" means.
    const seats = [QB]
    const out = optimalLineup([p(1, 'Goose Egg', 0, [QB])], seats)
    expect(out.unfilled).toEqual([])
    expect(out.total).toBe(0)
  })
})

describe('optimalLineup — cross-checked against an exhaustive solver', () => {
  // Deterministic pseudo-random, so a failure is reproducible.
  function rng(seed: number) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /** Slot sets that mirror real fantasy eligibility, superflex included. */
  const ELIGIBILITY: number[][] = [
    [QB, OP],
    [RB, FLEX, OP],
    [WR, FLEX, OP],
    [TE, FLEX, OP],
    [DST],
    [K],
    [RB, WR, FLEX, OP], // multi-position, which ESPN does grant
  ]

  it('matches exhaustive search over 300 random rosters', () => {
    const r = rng(20260911)
    const seats = [QB, RB, RB, WR, WR, TE, OP, FLEX, DST, K]

    for (let trial = 0; trial < 300; trial++) {
      // Kept small: the DP visits every SUBSET of players, so each extra body
      // doubles its work. Ten is plenty to exercise the matching.
      const size = 6 + Math.floor(r() * 5) // 6-10 players
      const roster: OptimizerPlayer[] = []
      for (let i = 0; i < size; i++) {
        roster.push(p(
          i + 1,
          `P${i}`,
          Math.round(r() * 400) / 10,
          ELIGIBILITY[Math.floor(r() * ELIGIBILITY.length)],
        ))
      }

      expect(optimalLineup(roster, seats).total, `trial ${trial}`)
        .toBeCloseTo(exhaustive(roster, seats), 6)
    }
  })

  it('matches exhaustive search on superflex-heavy rosters', () => {
    // Rosters made mostly of QBs are where the OP slot actually bites.
    const r = rng(777)
    const seats = [QB, OP, FLEX]

    for (let trial = 0; trial < 200; trial++) {
      const roster: OptimizerPlayer[] = []
      const size = 3 + Math.floor(r() * 5) // 3-7 players
      for (let i = 0; i < size; i++) {
        const slots = r() < 0.6 ? [QB, OP] : ELIGIBILITY[1 + Math.floor(r() * 3)]
        roster.push(p(i + 1, `P${i}`, Math.round(r() * 350) / 10, slots))
      }
      expect(optimalLineup(roster, seats).total, `trial ${trial}`)
        .toBeCloseTo(exhaustive(roster, seats), 6)
    }
  })
})

describe('pointsLeftOnBench', () => {
  it('reports the gap between the best lineup and the one started', () => {
    expect(pointsLeftOnBench(120.5, 102.1)).toBeCloseTo(18.4, 6)
  })

  it('is zero for a perfect lineup', () => {
    expect(pointsLeftOnBench(120.5, 120.5)).toBe(0)
  })

  it('clamps rather than reporting a negative gap', () => {
    // The started lineup is itself a legal assignment, so the optimum can never
    // be worse. A negative here means the data disagrees with itself, and
    // "minus four points left on the bench" is nonsense on a card.
    expect(pointsLeftOnBench(100, 104)).toBe(0)
  })
})

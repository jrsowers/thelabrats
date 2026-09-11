/**
 * The highest-scoring legal lineup a roster could have started.
 *
 * ⚠️ THIS IS AN ASSIGNMENT PROBLEM, NOT A SORT (CLAUDE.md). The obvious
 * approach — walk the roster from highest score down, drop each player into the
 * best open slot he fits — is provably wrong, and wrong in exactly the shape
 * this league has. Slot 7 (OP) is a superflex: it accepts QBs, and so does slot
 * 0. Take this roster, with one QB slot, one OP slot and one FLEX:
 *
 *     Mahomes  30 pts   eligible QB, OP
 *     Allen    28 pts   eligible QB, OP
 *     Barkley  20 pts   eligible RB, OP, FLEX
 *
 * Greedy puts Mahomes in QB, then Allen in OP, then Barkley in FLEX — 78, and
 * correct here. But move one point around and the ordering flips: greedy
 * commits a player to a slot before it knows what the NEXT player needs, and
 * nothing in it can walk that back. The only way to be sure is to solve all the
 * assignments together.
 *
 * So: maximum-weight bipartite matching between starting SEATS and players,
 * solved exactly by the Hungarian algorithm. A twelve-team roster is sixteen
 * players and ten seats, so cost is irrelevant — correctness is the whole
 * point, since this number is the entire content of two awards.
 *
 * Pure, no I/O, and deterministic: ties break toward the lower player id so the
 * same roster always yields the same lineup.
 */

/** A player who could legally be started, with the points he actually scored. */
export interface OptimizerPlayer {
  espnPlayerId: number
  name: string
  /**
   * Points actually scored. The caller resolves a missing stat line to zero —
   * see optimalLineup's note on why that is safe HERE and nowhere else.
   */
  points: number
  /** ESPN lineup slot ids this player may occupy. */
  eligibleSlots: number[]
}

export interface Assignment {
  slotId: number
  player: OptimizerPlayer
}

export interface OptimalLineup {
  /** Points the best legal lineup would have scored. */
  total: number
  assignments: Assignment[]
  /** Seats no eligible player could fill — a short roster, or a bye-week hole. */
  unfilled: number[]
}

/**
 * Cannot be matched. Large enough to never win against an empty seat, finite so
 * the potentials stay arithmetic rather than NaN.
 */
const IMPOSSIBLE = -1e9

/**
 * Expand `{ "0": 1, "2": 2 }` into one seat per startable spot: [0, 2, 2].
 *
 * Bench (20) and IR (21) are not seats. A player on IR is excluded by the
 * CALLER, because he is ineligible to start regardless of what slots he lists.
 */
export function startingSeats(
  slotCounts: Record<string | number, number>,
  nonStarterSlots: ReadonlySet<number>,
): number[] {
  const seats: number[] = []
  for (const [slot, count] of Object.entries(slotCounts)) {
    const slotId = Number(slot)
    if (nonStarterSlots.has(slotId)) continue
    for (let i = 0; i < count; i++) seats.push(slotId)
  }
  return seats.sort((a, b) => a - b)
}

/**
 * Maximum-weight assignment of players to seats.
 *
 * The Hungarian algorithm over a rectangular matrix, via successive shortest
 * augmenting paths with potentials (the JV formulation). Rows are seats,
 * columns are players; every seat is matched, to a real player or to nothing.
 *
 * Implemented on COSTS (minimise) because that is the form the algorithm is
 * stated in and the form its correctness is argued in. Points become negative
 * costs on the way in and the sign is undone on the way out — writing a
 * maximising variant from memory is how a subtle bug gets in.
 */
function solve(seats: number[], players: OptimizerPlayer[]): (number | null)[] {
  const n = seats.length
  const m = players.length
  if (n === 0 || m === 0) return new Array(n).fill(null)

  // ⚠️ THE FORMULATION BELOW REQUIRES AT LEAST AS MANY COLUMNS AS ROWS. With
  // more seats than players it never finds an augmenting path, `delta` stays
  // infinite, and the loop spins forever — which is what a roster short of
  // bodies looks like: a bye week, an unfilled kicker slot, a new league.
  //
  // So every seat also gets a column meaning "leave this one empty", priced at
  // zero. A real eligible player scoring anything beats it; an ineligible pair,
  // priced beyond reach, never does.
  const columns = players.length + n
  const cost: number[][] = seats.map((slotId) =>
    Array.from({ length: columns }, (_, j) =>
      j >= m ? 0
      : players[j].eligibleSlots.includes(slotId) ? -players[j].points
      : -IMPOSSIBLE,
    ),
  )

  // 1-indexed working arrays, as the standard formulation assumes.
  const INF = Infinity
  const u = new Array(n + 1).fill(0)
  const v = new Array(columns + 1).fill(0)
  const p = new Array(columns + 1).fill(0) // p[j] = seat matched to column j
  const way = new Array(columns + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(columns + 1).fill(INF)
    const used = new Array(columns + 1).fill(false)

    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF
      let j1 = 0

      for (let j = 1; j <= columns; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }

      for (let j = 0; j <= columns; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)

    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0)
  }

  // Invert: seat -> player index. Columns past `m` are the empty-seat padding.
  //
  // Eligibility is re-checked against the roster rather than inferred from the
  // cost matrix. An ineligible pairing should be unreachable — there is always
  // a spare empty-seat column, priced far below one — but reading it back off a
  // sentinel value means the next person to change the padding has to rederive
  // which comparison is the safe one.
  const bySeat: (number | null)[] = new Array(n).fill(null)
  for (let j = 1; j <= m; j++) {
    const seat = p[j]
    if (seat <= 0) continue
    if (!players[j - 1].eligibleSlots.includes(seats[seat - 1])) continue
    bySeat[seat - 1] = j - 1
  }
  return bySeat
}

/**
 * The best legal lineup, and what it would have scored.
 *
 * ⚠️ A MISSING STAT LINE IS ZERO HERE, and null everywhere else. Elsewhere in
 * this codebase "no actual row" means the player's game has not kicked off, and
 * reading it as zero would make him the week's biggest projection miss without
 * playing a snap. This function only ever runs on a FINAL week, where there is
 * nothing left to play: a player with no line did not score, and treating him
 * as unknown would silently exclude him from a lineup he was eligible for.
 *
 * Players on IR must be filtered out by the caller. They list slot 21 among
 * their eligible slots and would otherwise be assignable to it — except 21 is
 * not a seat, so they simply go unused, which is correct but accidental.
 */
export function optimalLineup(
  players: OptimizerPlayer[],
  seats: number[],
): OptimalLineup {
  // Deterministic tie-breaking: same roster, same lineup, every time.
  const ordered = [...players].sort(
    (a, b) => b.points - a.points || a.espnPlayerId - b.espnPlayerId,
  )

  const bySeat = solve(seats, ordered)
  const assignments: Assignment[] = []
  const unfilled: number[] = []

  seats.forEach((slotId, i) => {
    const playerIndex = bySeat[i]
    if (playerIndex == null) unfilled.push(slotId)
    else assignments.push({ slotId, player: ordered[playerIndex] })
  })

  return {
    total: assignments.reduce((n, a) => n + a.player.points, 0),
    assignments,
    unfilled,
  }
}

/**
 * Points a manager left on the bench: the best legal lineup minus what he
 * actually started.
 *
 * Never negative. The lineup he started IS a legal assignment, so the optimum
 * cannot be worse — a negative result would mean the data disagrees with
 * itself (a player started in a slot he is not eligible for), and reporting
 * that as "minus four points left on the bench" would be nonsense on a card.
 */
export function pointsLeftOnBench(optimal: number, actualStarterPoints: number): number {
  return Math.max(0, optimal - actualStarterPoints)
}

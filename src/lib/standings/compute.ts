/**
 * Standings engine. Pure functions, no I/O — the whole point is that it can be
 * tested exhaustively (§42) and never quietly disagrees with itself.
 *
 * Ranks are recomputed from matchup results rather than read from a stored
 * snapshot, so "where did this team sit last week" is answerable at any time
 * without having captured it in advance.
 */

export interface StandingsInput {
  week: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
  status: string
}

export interface TeamMeta {
  seasonTeamId: number
  name: string
}

export interface StandingsRow {
  seasonTeamId: number
  rank: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  /** e.g. { type: 'W', count: 3 }; null before a team has played. */
  streak: { type: 'W' | 'L' | 'T'; count: number } | null
  gamesPlayed: number
  winPct: number
  /** Why this team sits above the next one, when record alone did not decide it. */
  tiebreakNote: string | null
  /**
   * Which rule decided it. The UI hides POINTS_FOR notes, since points for is
   * already its own column — only head-to-head adds information not on screen.
   */
  tiebreakKind: 'HEAD_TO_HEAD' | 'POINTS_FOR' | null
}

type Result = 'W' | 'L' | 'T'

/** Only completed games count. A live game is not a result yet. */
const isCounted = (m: StandingsInput, throughWeek: number) =>
  m.status === 'FINAL' && m.week <= throughWeek

/**
 * Head-to-head record between two teams, over completed games only.
 * Confirmed by the commissioner as this league's seeding tiebreaker (2026-08-28).
 */
function headToHead(
  matchups: StandingsInput[], a: number, b: number, throughWeek: number,
): { aWins: number; bWins: number; played: number } {
  let aWins = 0, bWins = 0, played = 0
  for (const m of matchups) {
    if (!isCounted(m, throughWeek)) continue
    const pair =
      (m.homeTeamId === a && m.awayTeamId === b) || (m.homeTeamId === b && m.awayTeamId === a)
    if (!pair) continue
    played++
    if (m.homeScore === m.awayScore) continue
    const winner = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId
    if (winner === a) aWins++
    else bWins++
  }
  return { aWins, bWins, played }
}

/**
 * Order a group of teams that are tied on record.
 *
 * Head-to-head first — CONFIRMED by the commissioner as this league's rule. For a two-way tie that is simply
 * their record against each other. For three or more, each team is scored on a
 * mini round-robin against only the others in the tie — the standard approach,
 * and the reason this cannot be expressed as a simple comparator: a team's
 * tiebreak value depends on which teams it is tied WITH.
 *
 * Points-for breaks whatever head-to-head cannot.
 */
function breakTie(
  group: StandingsRow[], matchups: StandingsInput[], throughWeek: number,
): StandingsRow[] {
  if (group.length < 2) return group

  const h2h = new Map<number, { wins: number; losses: number; played: number }>()
  for (const team of group) {
    let wins = 0, losses = 0, played = 0
    for (const other of group) {
      if (other.seasonTeamId === team.seasonTeamId) continue
      const r = headToHead(matchups, team.seasonTeamId, other.seasonTeamId, throughWeek)
      wins += r.aWins
      losses += r.bWins
      played += r.played
    }
    h2h.set(team.seasonTeamId, { wins, losses, played })
  }

  const sorted = [...group].sort((a, b) => {
    const ha = h2h.get(a.seasonTeamId)!
    const hb = h2h.get(b.seasonTeamId)!
    // Only meaningful if both have actually played inside the group.
    if (ha.played > 0 && hb.played > 0) {
      const pa = ha.wins / Math.max(1, ha.wins + ha.losses)
      const pb = hb.wins / Math.max(1, hb.wins + hb.losses)
      if (pb !== pa) return pb - pa
    }
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
    return a.seasonTeamId - b.seasonTeamId
  })

  // Explain the result, so the table can justify itself (§21.6).
  for (const row of sorted) {
    const h = h2h.get(row.seasonTeamId)!
    if (h.played > 0) {
      row.tiebreakKind = 'HEAD_TO_HEAD'
      row.tiebreakNote = `Head-to-head ${h.wins}-${h.losses} vs tied teams`
    } else {
      row.tiebreakKind = 'POINTS_FOR'
      row.tiebreakNote = `Points for ${row.pointsFor.toFixed(2)}`
    }
  }
  return sorted
}

export function computeStandings(
  matchups: StandingsInput[],
  teams: TeamMeta[],
  throughWeek: number,
): StandingsRow[] {
  const rows = new Map<number, StandingsRow>()
  for (const t of teams) {
    rows.set(t.seasonTeamId, {
      seasonTeamId: t.seasonTeamId,
      rank: 0, wins: 0, losses: 0, ties: 0,
      pointsFor: 0, pointsAgainst: 0,
      streak: null, gamesPlayed: 0, winPct: 0,
      tiebreakNote: null, tiebreakKind: null,
    })
  }

  // Results per team in week order, for streak calculation.
  const history = new Map<number, { week: number; result: Result }[]>()

  const played = matchups
    .filter((m) => isCounted(m, throughWeek))
    .sort((a, b) => a.week - b.week)

  for (const m of played) {
    if (m.homeTeamId == null || m.awayTeamId == null) continue
    const home = rows.get(m.homeTeamId)
    const away = rows.get(m.awayTeamId)
    if (!home || !away) continue

    home.pointsFor += m.homeScore
    home.pointsAgainst += m.awayScore
    away.pointsFor += m.awayScore
    away.pointsAgainst += m.homeScore
    home.gamesPlayed++
    away.gamesPlayed++

    let homeResult: Result
    if (m.homeScore > m.awayScore) { home.wins++; away.losses++; homeResult = 'W' }
    else if (m.homeScore < m.awayScore) { home.losses++; away.wins++; homeResult = 'L' }
    else { home.ties++; away.ties++; homeResult = 'T' }

    const awayResult: Result = homeResult === 'W' ? 'L' : homeResult === 'L' ? 'W' : 'T'
    if (!history.has(m.homeTeamId)) history.set(m.homeTeamId, [])
    if (!history.has(m.awayTeamId)) history.set(m.awayTeamId, [])
    history.get(m.homeTeamId)!.push({ week: m.week, result: homeResult })
    history.get(m.awayTeamId)!.push({ week: m.week, result: awayResult })
  }

  for (const row of rows.values()) {
    // A tie counts as half a win, which is how every fantasy platform does it.
    row.winPct = row.gamesPlayed === 0
      ? 0
      : (row.wins + row.ties * 0.5) / row.gamesPlayed

    const games = history.get(row.seasonTeamId) ?? []
    if (games.length > 0) {
      const latest = games[games.length - 1].result
      let count = 0
      for (let i = games.length - 1; i >= 0 && games[i].result === latest; i--) count++
      row.streak = { type: latest, count }
    }
  }

  // Record first, then resolve each tied block on head-to-head.
  const byRecord = [...rows.values()].sort((a, b) => b.winPct - a.winPct)
  const out: StandingsRow[] = []
  let i = 0
  while (i < byRecord.length) {
    let j = i
    while (j + 1 < byRecord.length && byRecord[j + 1].winPct === byRecord[i].winPct) j++
    out.push(...breakTie(byRecord.slice(i, j + 1), matchups, throughWeek))
    i = j + 1
  }

  out.forEach((row, idx) => { row.rank = idx + 1 })
  return out
}

/**
 * Playoff status per team.
 *
 * CLINCHED is deliberately CONSERVATIVE: a team is only marked clinched when it
 * cannot miss even if it loses out and every rival wins out. That can be a week
 * later than a full elimination analysis would allow — a rigorous answer needs
 * the max-flow argument used for baseball elimination, since rivals who play
 * each other cannot all win out. Being late is acceptable; claiming a berth that
 * is not certain is not (§66: data correctness first).
 */
export type PlayoffStatus = 'CLINCHED' | 'IN' | 'BUBBLE' | 'ELIMINATED'

export function computePlayoffStatus(
  rows: StandingsRow[],
  totalWeeks: number,
  throughWeek: number,
  playoffSpots: number,
): Map<number, PlayoffStatus> {
  const status = new Map<number, PlayoffStatus>()
  const remaining = Math.max(0, totalWeeks - throughWeek)

  // With nothing left to play the table IS the result — tiebreakers have already
  // been applied, so rank alone is exact. The probabilistic reasoning below
  // cannot see that, and would leave teams tied on wins looking unresolved.
  if (remaining === 0) {
    for (const row of rows) {
      status.set(row.seasonTeamId, row.rank <= playoffSpots ? 'CLINCHED' : 'ELIMINATED')
    }
    return status
  }

  for (const row of rows) {
    // Worst case for this team: lose every remaining game.
    const floor = row.wins + row.ties * 0.5
    // Best case for a rival: win every remaining game.
    const rivalsWhoCanCatch = rows.filter(
      (o) => o.seasonTeamId !== row.seasonTeamId &&
        o.wins + o.ties * 0.5 + remaining >= floor,
    ).length

    // Best case for this team versus rivals' guaranteed floor.
    const ceiling = row.wins + row.ties * 0.5 + remaining
    const rivalsAlreadyAhead = rows.filter(
      (o) => o.seasonTeamId !== row.seasonTeamId && o.wins + o.ties * 0.5 > ceiling,
    ).length

    if (rivalsAlreadyAhead >= playoffSpots) status.set(row.seasonTeamId, 'ELIMINATED')
    else if (rivalsWhoCanCatch < playoffSpots) status.set(row.seasonTeamId, 'CLINCHED')
    else if (row.rank <= playoffSpots) status.set(row.seasonTeamId, 'IN')
    else status.set(row.seasonTeamId, 'BUBBLE')
  }
  return status
}

/**
 * Rank change against the previous completed week.
 *
 * Positive = moved up the table. Returns 0 when there is no prior week to
 * compare against, rather than inventing movement out of nothing.
 */
/**
 * @deprecated Diffs the COMPUTED table only, with no idea what the caller is
 * displaying. That mismatch is the bug: the standings page showed ESPN seeds
 * beside these deltas and got six of twelve arrows wrong. Use
 * `rankedForWeek` + `movementBetween`, which make the caller supply the table.
 *
 * Kept for the preview mode, where the season is simulated and no ESPN seed
 * exists or should.
 */
export function computeMovement(
  matchups: StandingsInput[],
  teams: TeamMeta[],
  throughWeek: number,
): Map<number, number> {
  const movement = new Map<number, number>()
  if (throughWeek <= 1) return movement

  const now = computeStandings(matchups, teams, throughWeek)
  const before = computeStandings(matchups, teams, throughWeek - 1)

  // No games completed before this week means no meaningful prior ranking.
  if (before.every((r) => r.gamesPlayed === 0)) return movement

  const priorRank = new Map(before.map((r) => [r.seasonTeamId, r.rank]))
  for (const row of now) {
    const prior = priorRank.get(row.seasonTeamId)
    if (prior != null) movement.set(row.seasonTeamId, prior - row.rank)
  }
  return movement
}

/** The last week with any completed game — what "current standings" means. */
export function latestCompletedWeek(matchups: StandingsInput[]): number {
  return matchups.reduce((max, m) => (m.status === 'FINAL' && m.week > max ? m.week : max), 0)
}

/* ============================================================
   Reconciliation with ESPN (§18, CLAUDE.md: ESPN is the system of record)
   ============================================================ */

export interface EspnSeedInput {
  seasonTeamId: number
  playoffSeed: number | null
  wins: number
  losses: number
  ties: number
}

export interface Reconciliation {
  /** Rows in the order the site should show them. */
  rows: StandingsRow[]
  /** True when ESPN's seeds decided the order rather than our arithmetic. */
  usedEspnSeeds: boolean
  /** Teams whose ESPN record differs from the one we computed. */
  recordMismatches: number[]
}

/**
 * Reconcile our computed table against ESPN's.
 *
 * ESPN owns the tiebreaker rulebook, so once its seeds mean something they
 * decide the order and ours becomes the cross-check. Two guards keep that from
 * going wrong:
 *
 *   * Before any game is final, ESPN fills `playoffSeed` with reverse draft
 *     order — a real number that is not a standing. Ignored.
 *   * A partial or duplicated seed set is ignored outright rather than used to
 *     half-reorder the table.
 *
 * The record comparison is separate on purpose. Both sides derive W-L-T from
 * the same games, so a disagreement means one of us is wrong, and the site
 * should say so rather than quietly pick a winner.
 */
export function reconcileWithEspn(
  rows: StandingsRow[],
  espn: EspnSeedInput[],
  throughWeek: number,
): Reconciliation {
  const byTeam = new Map(espn.map((e) => [e.seasonTeamId, e]))

  const recordMismatches = rows
    .filter((r) => {
      const e = byTeam.get(r.seasonTeamId)
      if (!e) return false
      return e.wins !== r.wins || e.losses !== r.losses || e.ties !== r.ties
    })
    .map((r) => r.seasonTeamId)

  const seeds = rows.map((r) => byTeam.get(r.seasonTeamId)?.playoffSeed ?? null)
  const complete =
    throughWeek > 0 &&
    seeds.every((s): s is number => typeof s === 'number' && s > 0) &&
    new Set(seeds).size === rows.length

  if (!complete) return { rows, usedEspnSeeds: false, recordMismatches }

  const ordered = [...rows]
    .sort((a, b) => byTeam.get(a.seasonTeamId)!.playoffSeed! - byTeam.get(b.seasonTeamId)!.playoffSeed!)
    .map((r) => ({ ...r, rank: byTeam.get(r.seasonTeamId)!.playoffSeed! }))

  return { rows: ordered, usedEspnSeeds: true, recordMismatches }
}

/* ============================================================
   Rank movement — ONE source for the table and its arrows
   ============================================================ */

/** A team's position in the table for one week. */
export interface RankedWeek {
  seasonTeamId: number
  rank: number
}

/**
 * week -> (seasonTeamId -> ESPN playoff seed), from
 * `standings_snapshots.espn_seed`.
 *
 * ⚠️ NOT `standings_snapshots.seed`. That column is a local ordering on win
 * percentage then points-for — no head-to-head, no ESPN — and after week 2 of
 * 2026 it disagreed with ESPN's real seeding for four of twelve teams. The
 * name is a trap; `espn_seed` is the authoritative one.
 */
export type SeedHistory = Map<number, Map<number, number>>

/**
 * The authoritative table for one week.
 *
 * ⚠️ THE ONLY WAY TO ASK "WHERE DID THIS TEAM SIT". Every caller goes through
 * here so that a rank and the arrow beside it can never come from different
 * rulebooks.
 *
 * That is not hypothetical. The standings page displayed ESPN's seeds while
 * `computeMovement` diffed OUR engine's ranks, so after week 2 it rendered Doug
 * at rank 6 with a "down 6" arrow — a delta from a table the reader could not
 * see, since our engine had him 9th. Six of twelve arrows were wrong, and the
 * Free Fallin' award named a manager who was only the third-biggest faller by
 * ESPN's reckoning.
 *
 * ESPN owns the tiebreak rulebook (CLAUDE.md), so its seed wins whenever we
 * have a complete set for that week. We fall back to the computed table only
 * when we do not — an incomplete seed set cannot be mixed with computed ranks,
 * because half a table from each rulebook is the bug this function exists to
 * prevent.
 */
export function rankedForWeek(
  matchups: StandingsInput[],
  teams: TeamMeta[],
  week: number,
  seeds?: SeedHistory,
): { rows: RankedWeek[]; source: 'espn' | 'computed' } {
  // No table exists before the first week, so there is nothing to have moved
  // within. Returning an EMPTY table rather than a zeroed one is what stops
  // `movementBetween` inventing arrows in week 1 — it only reports a team it
  // can find on both sides.
  if (week < 1) return { rows: [], source: 'computed' }

  const forWeek = seeds?.get(week)
  if (forWeek && forWeek.size === teams.length) {
    const values = [...forWeek.values()]
    const complete = values.every((n) => Number.isFinite(n) && n > 0)
      && new Set(values).size === teams.length
    if (complete) {
      return {
        rows: teams
          .map((t) => ({ seasonTeamId: t.seasonTeamId, rank: forWeek.get(t.seasonTeamId)! }))
          .sort((a, b) => a.rank - b.rank),
        source: 'espn',
      }
    }
  }

  const computed = computeStandings(matchups, teams, week)
  // A week in which nobody has played is not a ranking, it is an alphabetical
  // list. Treat it as no table at all.
  if (computed.every((r) => r.gamesPlayed === 0)) return { rows: [], source: 'computed' }

  return {
    rows: computed.map((r) => ({ seasonTeamId: r.seasonTeamId, rank: r.rank })),
    source: 'computed',
  }
}

/**
 * Movement for a week, or NOTHING when the two weeks cannot be compared.
 *
 * ⚠️ THE ONLY SUPPORTED WAY TO GET AN ARROW. Both the standings page and the
 * Free Fallin' award go through here, so neither can diff one rulebook against
 * another — the bug this whole module was reshaped around.
 *
 * Returns null when the previous week and this week would be ranked by
 * different rulebooks. That happens for real: ESPN seeds were only captured
 * from 2026-09-22, so week 2 has an ESPN table and week 1 does not. **A missing
 * arrow is correct there and a computed one would be a lie** — it would be
 * measured against a table the reader is not being shown.
 */
export function rankMovementFor(
  matchups: StandingsInput[],
  teams: TeamMeta[],
  week: number,
  seeds?: SeedHistory,
): { movement: Map<number, number>; changes: RankChange[]; source: 'espn' | 'computed' } | null {
  if (week <= 1) return null

  const previous = rankedForWeek(matchups, teams, week - 1, seeds)
  const current = rankedForWeek(matchups, teams, week, seeds)
  if (previous.rows.length === 0 || current.rows.length === 0) return null

  // Mixing sources is the entire failure mode. Refuse rather than approximate.
  if (previous.source !== current.source) return null

  return {
    movement: movementBetween(previous.rows, current.rows),
    changes: rankChangeBetween(previous.rows, current.rows),
    source: current.source,
  }
}

/**
 * How far each team moved between two tables.
 *
 * Positive = up. Takes the tables rather than recomputing them, so the caller
 * is forced to hand over the same rows it is about to display.
 */
export function movementBetween(
  previous: RankedWeek[],
  current: RankedWeek[],
): Map<number, number> {
  const before = new Map(previous.map((r) => [r.seasonTeamId, r.rank]))
  const out = new Map<number, number>()
  for (const row of current) {
    const prior = before.get(row.seasonTeamId)
    if (prior != null) out.set(row.seasonTeamId, prior - row.rank)
  }
  return out
}

/** Both ends of the move, for awards that have to show where a team fell from. */
export function rankChangeBetween(
  previous: RankedWeek[],
  current: RankedWeek[],
): RankChange[] {
  const before = new Map(previous.map((r) => [r.seasonTeamId, r.rank]))
  return current
    .filter((r) => before.has(r.seasonTeamId))
    .map((r) => ({
      seasonTeamId: r.seasonTeamId,
      from: before.get(r.seasonTeamId)!,
      to: r.rank,
    }))
}

export interface RankChange {
  seasonTeamId: number
  /** Position after last week. */
  from: number
  /** Position after this week. */
  to: number
}

/**
 * Where each team sat before this week and where they sit now.
 *
 * ⚠️ This comment used to claim that re-deriving a rank elsewhere "would risk
 * disagreeing with the table the league is reading". It did exactly that: the
 * table moved to ESPN's seeds and this did not follow, so the award named the
 * third-biggest faller as the biggest. The lesson is that a warning in a
 * comment does not hold an invariant — `rankedForWeek` does.
 *
 * Empty before week 2, which has no prior table to have moved within.
 */
/**
 * @deprecated Same flaw as `computeMovement` — see its note. Use
 * `rankedForWeek` + `rankChangeBetween`.
 */
export function computeRankChange(
  matchups: StandingsInput[],
  teams: TeamMeta[],
  throughWeek: number,
): RankChange[] {
  if (throughWeek <= 1) return []

  const before = computeStandings(matchups, teams, throughWeek - 1)
  if (before.every((r) => r.gamesPlayed === 0)) return []

  const now = computeStandings(matchups, teams, throughWeek)
  const priorRank = new Map(before.map((r) => [r.seasonTeamId, r.rank]))

  return now
    .map((row) => ({
      seasonTeamId: row.seasonTeamId,
      from: priorRank.get(row.seasonTeamId) ?? row.rank,
      to: row.rank,
    }))
}

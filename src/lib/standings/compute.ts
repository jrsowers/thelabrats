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
 * Head-to-head first, per league settings. For a two-way tie that is simply
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
    row.tiebreakNote = h.played > 0
      ? `Head-to-head ${h.wins}-${h.losses} vs tied teams`
      : `Points for ${row.pointsFor.toFixed(2)}`
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
      streak: null, gamesPlayed: 0, winPct: 0, tiebreakNote: null,
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

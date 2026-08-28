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
}

type Result = 'W' | 'L' | 'T'

/** Only completed games count. A live game is not a result yet. */
const isCounted = (m: StandingsInput, throughWeek: number) =>
  m.status === 'FINAL' && m.week <= throughWeek

/**
 * Sort order: win percentage, then points for.
 *
 * ⚠️ ESPN reports this league's `playoffSeedingRule` as H2H_RECORD, but does not
 * expose the full tiebreak chain below record. Points-for is ESPN's usual next
 * tiebreaker and is what is applied here — it is NOT confirmed against the
 * commissioner's settings (§29). Until it is, the playoff picture derived from
 * these ranks must be labelled unofficial.
 */
function compare(a: StandingsRow, b: StandingsRow): number {
  if (b.winPct !== a.winPct) return b.winPct - a.winPct
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
  return a.seasonTeamId - b.seasonTeamId // stable, deterministic last resort
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

  const sorted = [...rows.values()].sort(compare)
  sorted.forEach((row, i) => { row.rank = i + 1 })
  return sorted
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

/**
 * Team records: everything derivable from a schedule of final scores.
 *
 * Pure. Records recalculate from stored matchups on every render, so a record
 * can never drift out of sync with the games it claims to describe (§24.5).
 */
import {
  bestOf, HIGH, LOW,
  type LeagueRecord, type RecordHolder, type RecordTone,
  type RecordScope, type RecordFormat,
} from './types'

export interface RecordMatchup {
  week: number
  year: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
  status: string
}

/** One in-game capture, for the comeback record. */
export interface RecordSnapshot {
  year: number
  week: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
}

const f = (n: number) => n.toFixed(2)

interface Side {
  teamId: number
  score: number
  against: number
  week: number
  year: number
  opponentId: number | null
}

export function toSides(matchups: RecordMatchup[]): Side[] {
  const out: Side[] = []
  for (const m of matchups) {
    if (m.status !== 'FINAL') continue
    if (m.homeTeamId != null) {
      out.push({
        teamId: m.homeTeamId, score: m.homeScore, against: m.awayScore,
        week: m.week, year: m.year, opponentId: m.awayTeamId,
      })
    }
    if (m.awayTeamId != null) {
      out.push({
        teamId: m.awayTeamId, score: m.awayScore, against: m.homeScore,
        week: m.week, year: m.year, opponentId: m.homeTeamId,
      })
    }
  }
  return out
}

/** A team's whole season, for the season-scope records. */
interface TeamSeason {
  teamId: number
  year: number
  games: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  /** Longest run of wins and of losses WITHIN this season. */
  bestWinStreak: number
  bestLossStreak: number
}

export function toTeamSeasons(sides: Side[]): TeamSeason[] {
  const byKey = new Map<string, Side[]>()
  for (const s of sides) {
    const key = `${s.year}:${s.teamId}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(s)
  }

  const out: TeamSeason[] = []
  for (const games of byKey.values()) {
    // Streaks are only meaningful in schedule order.
    games.sort((a, b) => a.week - b.week)
    const t: TeamSeason = {
      teamId: games[0].teamId, year: games[0].year,
      games: 0, wins: 0, losses: 0, ties: 0,
      pointsFor: 0, pointsAgainst: 0, bestWinStreak: 0, bestLossStreak: 0,
    }
    let runW = 0
    let runL = 0
    for (const g of games) {
      t.games += 1
      t.pointsFor += g.score
      t.pointsAgainst += g.against
      if (g.score > g.against) {
        t.wins += 1; runW += 1; runL = 0
      } else if (g.score < g.against) {
        t.losses += 1; runL += 1; runW = 0
      } else {
        // A tie breaks BOTH streaks. It is not a win and it is not a loss, and
        // letting it continue either one would overstate the run.
        t.ties += 1; runW = 0; runL = 0
      }
      t.bestWinStreak = Math.max(t.bestWinStreak, runW)
      t.bestLossStreak = Math.max(t.bestLossStreak, runL)
    }
    out.push(t)
  }
  return out
}

export function computeTeamRecords(
  matchups: RecordMatchup[],
  snapshots: RecordSnapshot[] = [],
): LeagueRecord[] {
  const sides = toSides(matchups)
  const finals = matchups.filter((m) => m.status === 'FINAL')
  if (sides.length === 0) return []

  const records: LeagueRecord[] = []

  const add = (
    key: string, label: string, tone: RecordTone, scope: RecordScope,
    format: RecordFormat,
    result: { value: number; winners: { holder: RecordHolder }[] } | null,
  ) => {
    if (!result || result.winners.length === 0) return
    records.push({
      key, label, group: 'team', scope, tone, format,
      value: result.value,
      holders: result.winners.map((w) => w.holder),
    })
  }

  // ---------------------------------------------------------- week scope
  const sideRows = sides.map((s) => ({
    s,
    holder: {
      teamId: s.teamId, year: s.year, week: s.week,
      context: `opponent scored ${f(s.against)}`,
    } satisfies RecordHolder,
  }))

  const pickSide = (
    key: string, label: string, tone: RecordTone,
    pool: typeof sideRows,
    cmp: (a: number, b: number) => boolean,
    context: (s: Side) => string,
  ) => {
    const withContext = pool.map((r) => ({ ...r, holder: { ...r.holder, context: context(r.s) } }))
    add(key, label, tone, 'week', 'points', bestOf(withContext, (r) => r.s.score, cmp))
  }

  pickSide('highest_score', 'Most Points, One Week', 'good', sideRows, HIGH,
    (s) => `opponent scored ${f(s.against)}`)
  pickSide('lowest_score', 'Fewest Points, One Week', 'bad', sideRows, LOW,
    (s) => `opponent scored ${f(s.against)}`)
  pickSide('highest_losing', 'Highest Losing Score', 'bad',
    sideRows.filter((r) => r.s.score < r.s.against), HIGH,
    (s) => `lost by ${f(s.against - s.score)}`)
  pickSide('lowest_winning', 'Lowest Winning Score', 'good',
    sideRows.filter((r) => r.s.score > r.s.against), LOW,
    (s) => `won by ${f(s.score - s.against)}`)

  // Margins, read from the WINNER's side and the LOSER's side separately.
  // Same number, two records, and each one names a different team — which is
  // the whole reason to carry both.
  const decided = sideRows.filter((r) => r.s.score !== r.s.against)
  const wins = decided.filter((r) => r.s.score > r.s.against)
    .map((r) => ({ ...r, holder: { ...r.holder, context: `${f(r.s.score)} – ${f(r.s.against)}` } }))
  const losses = decided.filter((r) => r.s.score < r.s.against)
    .map((r) => ({ ...r, holder: { ...r.holder, context: `${f(r.s.score)} – ${f(r.s.against)}` } }))
  const margin = (s: Side) => Math.abs(s.score - s.against)

  add('largest_margin', 'Largest Margin of Victory', 'good', 'week', 'points',
    bestOf(wins, (r) => margin(r.s), HIGH))
  add('smallest_margin', 'Narrowest Win', 'good', 'week', 'points',
    bestOf(wins, (r) => margin(r.s), LOW))
  add('largest_defeat', 'Largest Margin of Defeat', 'bad', 'week', 'points',
    bestOf(losses, (r) => margin(r.s), HIGH))
  add('smallest_defeat', 'Narrowest Defeat', 'bad', 'week', 'points',
    bestOf(losses, (r) => margin(r.s), LOW))

  // Combined totals are a property of the MATCHUP, so both teams hold it.
  const combined = finals.flatMap((m) => {
    const total = m.homeScore + m.awayScore
    const ctx = `${f(m.homeScore)} – ${f(m.awayScore)}`
    return [m.homeTeamId, m.awayTeamId]
      .filter((id): id is number => id != null)
      .map((teamId) => ({ total, holder: { teamId, year: m.year, week: m.week, context: ctx } }))
  })
  add('highest_combined', 'Highest Combined Score', 'good', 'week', 'points',
    bestOf(combined, (r) => r.total, HIGH))
  add('lowest_combined', 'Lowest Combined Score', 'bad', 'week', 'points',
    bestOf(combined, (r) => r.total, LOW))

  // ------------------------------------------------- largest comeback (week)
  // The biggest deficit any team faced mid-game and still won. Needs the
  // continuous capture; absent for weeks recorded before snapshots existed,
  // which is why an empty list omits the record rather than reporting zero.
  if (snapshots.length > 0) {
    const worst = new Map<string, { deficit: number; teamId: number; year: number; week: number; opp: number | null }>()
    for (const s of snapshots) {
      for (const [teamId, oppId, mine, theirs] of [
        [s.homeTeamId, s.awayTeamId, s.homeScore, s.awayScore],
        [s.awayTeamId, s.homeTeamId, s.awayScore, s.homeScore],
      ] as const) {
        if (teamId == null) continue
        const deficit = (theirs as number) - (mine as number)
        if (deficit <= 0) continue
        const key = `${s.year}:${s.week}:${teamId}`
        const prev = worst.get(key)
        if (!prev || deficit > prev.deficit) {
          worst.set(key, { deficit, teamId, year: s.year, week: s.week, opp: oppId })
        }
      }
    }
    const winners = new Set(sides.filter((s) => s.score > s.against).map((s) => `${s.year}:${s.week}:${s.teamId}`))
    const comebacks = [...worst.entries()]
      .filter(([key]) => winners.has(key))
      .map(([, v]) => ({
        deficit: v.deficit,
        holder: {
          teamId: v.teamId, year: v.year, week: v.week,
          context: `trailed by ${f(v.deficit)} and won`,
        } satisfies RecordHolder,
      }))
    add('largest_comeback', 'Largest Comeback', 'good', 'week', 'points',
      bestOf(comebacks, (r) => r.deficit, HIGH))
  }

  // -------------------------------------------------------- season scope
  const seasons = toTeamSeasons(sides)
  const seasonRows = seasons.map((t) => ({
    t,
    holder: { teamId: t.teamId, year: t.year, week: null, context: '' } satisfies RecordHolder,
  }))
  const pickSeason = (
    key: string, label: string, tone: RecordTone, format: RecordFormat,
    valueOf: (t: TeamSeason) => number,
    cmp: (a: number, b: number) => boolean,
    context: (t: TeamSeason) => string,
    pool = seasonRows,
    decimals = 2,
  ) => {
    const withContext = pool.map((r) => ({ ...r, holder: { ...r.holder, context: context(r.t) } }))
    add(key, label, tone, 'season', format, bestOf(withContext, (r) => valueOf(r.t), cmp, decimals))
  }

  const record = (t: TeamSeason) =>
    t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`

  pickSeason('most_wins', 'Most Wins, One Season', 'good', 'count',
    (t) => t.wins, HIGH, record, seasonRows, 0)
  pickSeason('most_losses', 'Most Losses, One Season', 'bad', 'count',
    (t) => t.losses, HIGH, record, seasonRows, 0)
  pickSeason('best_win_pct', 'Best Win Percentage', 'good', 'percent',
    (t) => (t.wins + t.ties * 0.5) / t.games, HIGH, record, seasonRows, 4)
  pickSeason('longest_win_streak', 'Longest Winning Streak', 'good', 'count',
    (t) => t.bestWinStreak, HIGH, (t) => `${record(t)} on the season`, seasonRows, 0)
  pickSeason('longest_losing_streak', 'Longest Losing Streak', 'bad', 'count',
    (t) => t.bestLossStreak, HIGH, (t) => `${record(t)} on the season`, seasonRows, 0)
  pickSeason('most_points_season', 'Most Points, One Season', 'good', 'points',
    (t) => t.pointsFor, HIGH, (t) => `over ${t.games} games`)
  pickSeason('fewest_points_season', 'Fewest Points, One Season', 'bad', 'points',
    (t) => t.pointsFor, LOW, (t) => `over ${t.games} games`)
  pickSeason('best_scoring_avg', 'Best Scoring Average', 'good', 'points',
    (t) => t.pointsFor / t.games, HIGH, (t) => `${f(t.pointsFor)} over ${t.games} games`)
  pickSeason('worst_scoring_avg', 'Worst Scoring Average', 'bad', 'points',
    (t) => t.pointsFor / t.games, LOW, (t) => `${f(t.pointsFor)} over ${t.games} games`)

  // Strength of schedule. Facing the league's best scorers all year is bad
  // luck, not an achievement — hence the tones, which run opposite to the
  // size of the number.
  pickSeason('toughest_schedule', 'Toughest Schedule', 'bad', 'points',
    (t) => t.pointsAgainst / t.games, HIGH,
    (t) => `${record(t)} against it`)
  pickSeason('easiest_schedule', 'Easiest Schedule', 'good', 'points',
    (t) => t.pointsAgainst / t.games, LOW,
    (t) => `${record(t)} against it`)

  return records
}

/** Career totals per franchise, for the all-time ledger. */
export interface CareerLine {
  teamId: number
  wins: number; losses: number; ties: number
  pointsFor: number; pointsAgainst: number
  games: number
  winPct: number
}

export function computeCareers(matchups: RecordMatchup[]): CareerLine[] {
  const map = new Map<number, CareerLine>()
  const get = (id: number) => {
    if (!map.has(id)) {
      map.set(id, {
        teamId: id, wins: 0, losses: 0, ties: 0,
        pointsFor: 0, pointsAgainst: 0, games: 0, winPct: 0,
      })
    }
    return map.get(id)!
  }

  for (const s of toSides(matchups)) {
    const line = get(s.teamId)
    line.games++
    line.pointsFor += s.score
    line.pointsAgainst += s.against
    if (s.score > s.against) line.wins++
    else if (s.score < s.against) line.losses++
    else line.ties++
  }

  for (const line of map.values()) {
    line.winPct = line.games === 0 ? 0 : (line.wins + line.ties * 0.5) / line.games
  }

  return [...map.values()].sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor)
}

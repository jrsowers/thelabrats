/**
 * Record book: the extremes of league history.
 *
 * Pure and derived from stored matchups, so records recalculate whenever the
 * underlying data changes — no stored record can drift out of sync with the
 * games it claims to describe (§24.5).
 *
 * Every record carries its context (§24.3). "178.4" alone is useless; "178.4,
 * Team Smith, week 11" is a record.
 */

export interface RecordMatchup {
  week: number
  year: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
  status: string
}

export interface LeagueRecord {
  key: string
  label: string
  /** Higher is better for this record? Drives the display accent. */
  polarity: 'high' | 'low'
  value: number
  /** The team the record belongs to. Null for matchup-level records. */
  teamId: number | null
  /** Both teams, for matchup-level records. */
  teamIds: number[]
  week: number
  year: number
  context: string
}

const f = (n: number) => n.toFixed(2)

interface Side {
  teamId: number; score: number; against: number
  week: number; year: number; opponentId: number | null
}

function toSides(matchups: RecordMatchup[]): Side[] {
  const out: Side[] = []
  for (const m of matchups) {
    if (m.status !== 'FINAL') continue
    if (m.homeTeamId != null) {
      out.push({ teamId: m.homeTeamId, score: m.homeScore, against: m.awayScore, week: m.week, year: m.year, opponentId: m.awayTeamId })
    }
    if (m.awayTeamId != null) {
      out.push({ teamId: m.awayTeamId, score: m.awayScore, against: m.homeScore, week: m.week, year: m.year, opponentId: m.homeTeamId })
    }
  }
  return out
}

/**
 * Compute every record we can. Records with no qualifying game are OMITTED
 * rather than returned as zero — an empty record book should look empty, not
 * like a league where nobody has ever scored.
 */
export function computeRecords(matchups: RecordMatchup[]): LeagueRecord[] {
  const sides = toSides(matchups)
  const finals = matchups.filter((m) => m.status === 'FINAL')
  if (sides.length === 0) return []

  const records: LeagueRecord[] = []

  const pick = (
    key: string, label: string, polarity: 'high' | 'low',
    pool: Side[], compare: (a: Side, b: Side) => number,
    context: (s: Side) => string,
  ) => {
    if (pool.length === 0) return
    const best = [...pool].sort(compare)[0]
    records.push({
      key, label, polarity,
      value: best.score,
      teamId: best.teamId,
      teamIds: [best.teamId, best.opponentId].filter((x): x is number => x != null),
      week: best.week, year: best.year,
      context: context(best),
    })
  }

  const desc = (a: Side, b: Side) => b.score - a.score
  const asc = (a: Side, b: Side) => a.score - b.score

  pick('highest_score', 'Highest Weekly Score', 'high', sides, desc,
    (s) => `def. by ${f(s.against)}`.replace('def. by', 'opponent scored'))
  pick('lowest_score', 'Lowest Weekly Score', 'low', sides, asc,
    (s) => `opponent scored ${f(s.against)}`)
  pick('highest_losing', 'Highest Losing Score', 'low',
    sides.filter((s) => s.score < s.against), desc,
    (s) => `lost by ${f(s.against - s.score)}`)
  pick('lowest_winning', 'Lowest Winning Score', 'high',
    sides.filter((s) => s.score > s.against), asc,
    (s) => `won by ${f(s.score - s.against)}`)

  // Matchup-level records.
  const margins = finals
    .map((m) => ({ m, margin: Math.abs(m.homeScore - m.awayScore) }))
    .filter((x) => x.margin > 0)

  if (margins.length > 0) {
    const widest = [...margins].sort((a, b) => b.margin - a.margin)[0]
    records.push({
      key: 'largest_margin', label: 'Largest Margin of Victory', polarity: 'high',
      value: widest.margin, teamId: null,
      teamIds: [widest.m.homeTeamId, widest.m.awayTeamId].filter((x): x is number => x != null),
      week: widest.m.week, year: widest.m.year,
      context: `${f(widest.m.homeScore)} – ${f(widest.m.awayScore)}`,
    })

    const closest = [...margins].sort((a, b) => a.margin - b.margin)[0]
    records.push({
      key: 'closest_win', label: 'Closest Win', polarity: 'low',
      value: closest.margin, teamId: null,
      teamIds: [closest.m.homeTeamId, closest.m.awayTeamId].filter((x): x is number => x != null),
      week: closest.m.week, year: closest.m.year,
      context: `${f(closest.m.homeScore)} – ${f(closest.m.awayScore)}`,
    })
  }

  const combined = finals.map((m) => ({ m, total: m.homeScore + m.awayScore }))
  if (combined.length > 0) {
    const hottest = [...combined].sort((a, b) => b.total - a.total)[0]
    records.push({
      key: 'highest_combined', label: 'Highest Combined Score', polarity: 'high',
      value: hottest.total, teamId: null,
      teamIds: [hottest.m.homeTeamId, hottest.m.awayTeamId].filter((x): x is number => x != null),
      week: hottest.m.week, year: hottest.m.year,
      context: `${f(hottest.m.homeScore)} – ${f(hottest.m.awayScore)}`,
    })

    const coldest = [...combined].sort((a, b) => a.total - b.total)[0]
    records.push({
      key: 'lowest_combined', label: 'Lowest Combined Score', polarity: 'low',
      value: coldest.total, teamId: null,
      teamIds: [coldest.m.homeTeamId, coldest.m.awayTeamId].filter((x): x is number => x != null),
      week: coldest.m.week, year: coldest.m.year,
      context: `${f(coldest.m.homeScore)} – ${f(coldest.m.awayScore)}`,
    })
  }

  return records
}

/** Career totals per franchise, for the all-time table. */
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
      map.set(id, { teamId: id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, games: 0, winPct: 0 })
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

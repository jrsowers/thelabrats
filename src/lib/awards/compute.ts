/**
 * Weekly awards ("Studs & Duds").
 *
 * Pure and deterministic (§22.8). Every award is computed from stored data and
 * regenerable; the LLM never selects or calculates one — it only phrases them
 * later, for recaps.
 *
 * SCOPE: this file computes the MATCHUP-level awards, which need only final
 * scores. The player-level awards (Stud, Dud, Bench Boss, Start/Sit Crime,
 * Projection Smasher/Disaster, Waiver Wizard) need `player_week_scores`, which
 * cannot be populated until games are actually played. They are declared in
 * AWARD_CATALOG with `blocked: true` so the gap is visible rather than silently
 * missing.
 *
 * An award with no meaningful candidate is omitted entirely (§22.2) — never
 * shown empty.
 */

export interface AwardMatchup {
  matchupId: number
  week: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
  status: string
}

/** Maps the engine's internal types onto catalog keys. */
export const AWARD_TYPE_TO_KEY: Record<string, string> = {
  MANAGER_OF_THE_WEEK: 'manager_of_the_week',
  BAD_BEAT: 'bad_beat',
  HIGHWAY_ROBBERY: 'highway_robbery',
  PHOTO_FINISH: 'photo_finish',
  PUBLIC_EXECUTION: 'public_execution',
  SHOOTOUT: 'shootout',
  DUMPSTER_FIRE: 'dumpster_fire',
}

export type AwardType =
  | 'BAD_BEAT'
  | 'HIGHWAY_ROBBERY'
  | 'PHOTO_FINISH'
  | 'PUBLIC_EXECUTION'
  | 'SHOOTOUT'
  | 'DUMPSTER_FIRE'
  | 'MANAGER_OF_THE_WEEK'

export interface Award {
  type: AwardType
  name: string
  /** One line explaining what earned it, built from real values. */
  headline: string
  /** The number this award is really about. */
  metric: { label: string; value: string }
  /** Team(s) the award attaches to. */
  teamIds: number[]
  matchupId: number
  supporting: { label: string; value: string }[]
}

/** @deprecated superseded by src/lib/awards/catalog.ts — kept for the tests. */
export const AWARD_CATALOG: {
  type: string
  name: string
  description: string
  blocked?: string
}[] = [
  { type: 'MANAGER_OF_THE_WEEK', name: 'Manager of the Week', description: 'Highest score of the week' },
  { type: 'BAD_BEAT', name: 'Bad Beat', description: 'Highest-scoring team that still lost' },
  { type: 'HIGHWAY_ROBBERY', name: 'Highway Robbery', description: 'Lowest-scoring team that still won' },
  { type: 'PHOTO_FINISH', name: 'Photo Finish', description: 'Closest matchup of the week' },
  { type: 'PUBLIC_EXECUTION', name: 'Public Execution', description: 'Largest margin of victory' },
  { type: 'SHOOTOUT', name: 'Shootout', description: 'Highest combined score' },
  { type: 'DUMPSTER_FIRE', name: 'Dumpster Fire', description: 'Lowest combined score' },
  { type: 'STUD_OF_THE_WEEK', name: 'Stud of the Week', description: 'Highest-impact starter', blocked: 'needs player_week_scores' },
  { type: 'DUD_OF_THE_WEEK', name: 'Dud of the Week', description: 'Worst starter against projection', blocked: 'needs player_week_scores' },
  { type: 'BENCH_BOSS', name: 'Bench Boss', description: 'Most points left on the bench', blocked: 'needs player_week_scores + lineup optimizer' },
  { type: 'START_SIT_CRIME', name: 'Start/Sit Crime', description: 'Most consequential lineup mistake', blocked: 'needs player_week_scores + lineup optimizer' },
  { type: 'PROJECTION_SMASHER', name: 'Projection Smasher', description: 'Largest actual over projected', blocked: 'needs player_week_scores' },
  { type: 'PROJECTION_DISASTER', name: 'Projection Disaster', description: 'Largest projected over actual', blocked: 'needs player_week_scores' },
  { type: 'WAIVER_WIRE_WIZARD', name: 'Waiver Wire Wizard', description: 'Best recent acquisition', blocked: 'needs player_week_scores + transactions' },
]

const f1 = (n: number) => n.toFixed(1)

interface Side { teamId: number; score: number; opponentScore: number; matchupId: number }

/** Flatten matchups into one row per team, which most awards reason over. */
function toSides(matchups: AwardMatchup[]): Side[] {
  const out: Side[] = []
  for (const m of matchups) {
    if (m.homeTeamId != null) {
      out.push({ teamId: m.homeTeamId, score: m.homeScore, opponentScore: m.awayScore, matchupId: m.matchupId })
    }
    if (m.awayTeamId != null) {
      out.push({ teamId: m.awayTeamId, score: m.awayScore, opponentScore: m.homeScore, matchupId: m.matchupId })
    }
  }
  return out
}

export function computeWeeklyAwards(all: AwardMatchup[], week: number): Award[] {
  // Only completed games. A live game has no result to award anything for.
  const matchups = all.filter((m) => m.week === week && m.status === 'FINAL')
  if (matchups.length === 0) return []

  const sides = toSides(matchups)
  const awards: Award[] = []

  const best = [...sides].sort((a, b) => b.score - a.score)[0]
  if (best) {
    awards.push({
      type: 'MANAGER_OF_THE_WEEK',
      name: 'Manager of the Week',
      headline: `Top score of the week at ${f1(best.score)}.`,
      metric: { label: 'Points', value: f1(best.score) },
      teamIds: [best.teamId],
      matchupId: best.matchupId,
      supporting: [{ label: 'Opponent', value: f1(best.opponentScore) }],
    })
  }

  // Losers, best first. Winning is score > opponent; a tie is neither.
  const losers = sides.filter((s) => s.score < s.opponentScore).sort((a, b) => b.score - a.score)
  if (losers[0]) {
    const s = losers[0]
    awards.push({
      type: 'BAD_BEAT',
      name: 'Bad Beat',
      headline: `Scored ${f1(s.score)} and still lost by ${f1(s.opponentScore - s.score)}.`,
      metric: { label: 'Points in a loss', value: f1(s.score) },
      teamIds: [s.teamId],
      matchupId: s.matchupId,
      supporting: [{ label: 'Margin', value: `-${f1(s.opponentScore - s.score)}` }],
    })
  }

  const winners = sides.filter((s) => s.score > s.opponentScore).sort((a, b) => a.score - b.score)
  if (winners[0]) {
    const s = winners[0]
    awards.push({
      type: 'HIGHWAY_ROBBERY',
      name: 'Highway Robbery',
      headline: `Won with just ${f1(s.score)} — the week's lowest winning score.`,
      metric: { label: 'Points in a win', value: f1(s.score) },
      teamIds: [s.teamId],
      matchupId: s.matchupId,
      supporting: [{ label: 'Opponent', value: f1(s.opponentScore) }],
    })
  }

  const byMargin = [...matchups]
    .map((m) => ({ m, margin: Math.abs(m.homeScore - m.awayScore) }))
    .sort((a, b) => a.margin - b.margin)

  const closest = byMargin[0]
  if (closest && closest.margin > 0) {
    awards.push({
      type: 'PHOTO_FINISH',
      name: 'Photo Finish',
      headline: `Decided by ${f1(closest.margin)} points.`,
      metric: { label: 'Margin', value: f1(closest.margin) },
      teamIds: [closest.m.homeTeamId, closest.m.awayTeamId].filter((x): x is number => x != null),
      matchupId: closest.m.matchupId,
      supporting: [{ label: 'Final', value: `${f1(closest.m.homeScore)}–${f1(closest.m.awayScore)}` }],
    })
  }

  const widest = byMargin[byMargin.length - 1]
  // Only interesting if it is actually a blowout, and not the same game as the
  // photo finish — which happens in a one-game week.
  if (widest && widest.margin >= 30 && widest.m.matchupId !== closest?.m.matchupId) {
    awards.push({
      type: 'PUBLIC_EXECUTION',
      name: 'Public Execution',
      headline: `A ${f1(widest.margin)}-point beating.`,
      metric: { label: 'Margin', value: f1(widest.margin) },
      teamIds: [widest.m.homeTeamId, widest.m.awayTeamId].filter((x): x is number => x != null),
      matchupId: widest.m.matchupId,
      supporting: [{ label: 'Final', value: `${f1(widest.m.homeScore)}–${f1(widest.m.awayScore)}` }],
    })
  }

  const byCombined = [...matchups]
    .map((m) => ({ m, total: m.homeScore + m.awayScore }))
    .sort((a, b) => b.total - a.total)

  const hottest = byCombined[0]
  if (hottest) {
    awards.push({
      type: 'SHOOTOUT',
      name: 'Shootout',
      headline: `${f1(hottest.total)} points between them.`,
      metric: { label: 'Combined', value: f1(hottest.total) },
      teamIds: [hottest.m.homeTeamId, hottest.m.awayTeamId].filter((x): x is number => x != null),
      matchupId: hottest.m.matchupId,
      supporting: [{ label: 'Final', value: `${f1(hottest.m.homeScore)}–${f1(hottest.m.awayScore)}` }],
    })
  }

  const coldest = byCombined[byCombined.length - 1]
  if (coldest && coldest.m.matchupId !== hottest?.m.matchupId) {
    awards.push({
      type: 'DUMPSTER_FIRE',
      name: 'Dumpster Fire',
      headline: `Only ${f1(coldest.total)} points between them. Nobody won here.`,
      metric: { label: 'Combined', value: f1(coldest.total) },
      teamIds: [coldest.m.homeTeamId, coldest.m.awayTeamId].filter((x): x is number => x != null),
      matchupId: coldest.m.matchupId,
      supporting: [{ label: 'Final', value: `${f1(coldest.m.homeScore)}–${f1(coldest.m.awayScore)}` }],
    })
  }

  return awards
}

/** Season tallies — who has collected which award most often (§22.7). */
export function computeAwardLeaderboard(
  all: AwardMatchup[], throughWeek: number,
): Map<AwardType, { teamId: number; count: number }[]> {
  const tally = new Map<AwardType, Map<number, number>>()
  for (let w = 1; w <= throughWeek; w++) {
    for (const award of computeWeeklyAwards(all, w)) {
      if (!tally.has(award.type)) tally.set(award.type, new Map())
      const inner = tally.get(award.type)!
      // Matchup awards attach to both teams; count the first, which is the
      // team the award is actually about.
      const teamId = award.teamIds[0]
      if (teamId != null) inner.set(teamId, (inner.get(teamId) ?? 0) + 1)
    }
  }

  const out = new Map<AwardType, { teamId: number; count: number }[]>()
  for (const [type, inner] of tally) {
    out.set(type, [...inner.entries()]
      .map(([teamId, count]) => ({ teamId, count }))
      .sort((a, b) => b.count - a.count))
  }
  return out
}

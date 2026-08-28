/**
 * Award computation.
 *
 * Pure and deterministic (§22.8): every award is derived from stored data and
 * regenerable, so a failed sync delays an award but never loses it. Nothing is
 * written — the awards table stays empty by design.
 *
 * SCOPE: this file computes the awards that need only FINAL TEAM SCORES. Awards
 * requiring player-level scoring, projections, the lineup optimizer or
 * transaction history are declared in catalog.ts with their dependency and fall
 * back to sample values until that data exists.
 *
 * Every award here is won by a MANAGER, not a matchup — including the ones that
 * describe a matchup outcome. "Lost by the largest margin" belongs to the team
 * that lost it.
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

/** Keys match catalog.ts, so no translation layer can drift. */
export type ComputedAwardKey =
  | 'cat_burglar'
  | 'dumpster_fire'
  | 'bad_beat'
  | 'public_execution'

export interface ComputedAward {
  key: ComputedAwardKey
  /** The manager who receives it. */
  teamId: number
  /** The other side of the matchup, where relevant. */
  opponentId: number | null
  metricValue: string
  headline: string
  supporting: { label: string; value: string }[]
}

const f1 = (n: number) => n.toFixed(1)

interface Side {
  teamId: number
  opponentId: number | null
  score: number
  against: number
  matchupId: number
}

/** One row per team, which is the shape every manager award reasons over. */
function toSides(matchups: AwardMatchup[]): Side[] {
  const out: Side[] = []
  for (const m of matchups) {
    if (m.homeTeamId != null) {
      out.push({ teamId: m.homeTeamId, opponentId: m.awayTeamId, score: m.homeScore, against: m.awayScore, matchupId: m.matchupId })
    }
    if (m.awayTeamId != null) {
      out.push({ teamId: m.awayTeamId, opponentId: m.homeTeamId, score: m.awayScore, against: m.homeScore, matchupId: m.matchupId })
    }
  }
  return out
}

/**
 * Compute every score-based award for a week.
 *
 * An award with no qualifying candidate is OMITTED rather than returned empty
 * (§22.2) — a week where nobody lost has no Bad Beat, and saying so is better
 * than showing a blank card.
 */
export function computeWeeklyAwards(all: AwardMatchup[], week: number): ComputedAward[] {
  const matchups = all.filter((m) => m.week === week && m.status === 'FINAL')
  if (matchups.length === 0) return []

  const sides = toSides(matchups)
  const awards: ComputedAward[] = []

  // A win requires outscoring the opponent; a tie is neither a win nor a loss.
  const winners = sides.filter((s) => s.score > s.against)
  const losers = sides.filter((s) => s.score < s.against)

  // ---- The Cat Burglar: lowest score that still won ----
  const thief = [...winners].sort((a, b) => a.score - b.score)[0]
  if (thief) {
    awards.push({
      key: 'cat_burglar',
      teamId: thief.teamId,
      opponentId: thief.opponentId,
      metricValue: f1(thief.score),
      headline: `Won with ${f1(thief.score)} — the lowest winning score of the week.`,
      supporting: [{ label: 'Opponent', value: f1(thief.against) }],
    })
  }

  // ---- The Dumpster Fire: lowest team score in the league ----
  const worst = [...sides].sort((a, b) => a.score - b.score)[0]
  if (worst) {
    awards.push({
      key: 'dumpster_fire',
      teamId: worst.teamId,
      opponentId: worst.opponentId,
      metricValue: f1(worst.score),
      headline: `${f1(worst.score)} points. Nobody in the league did worse.`,
      supporting: [{ label: 'Opponent', value: f1(worst.against) }],
    })
  }

  // ---- The Bad Beat: highest score that still lost ----
  const unlucky = [...losers].sort((a, b) => b.score - a.score)[0]
  if (unlucky) {
    awards.push({
      key: 'bad_beat',
      teamId: unlucky.teamId,
      opponentId: unlucky.opponentId,
      metricValue: f1(unlucky.score),
      headline: `Scored ${f1(unlucky.score)} and still lost by ${f1(unlucky.against - unlucky.score)}.`,
      supporting: [{ label: 'Margin', value: `-${f1(unlucky.against - unlucky.score)}` }],
    })
  }

  // ---- The Public Execution: lost by the largest margin ----
  const beaten = [...losers].sort((a, b) => (b.against - b.score) - (a.against - a.score))[0]
  if (beaten) {
    const margin = beaten.against - beaten.score
    awards.push({
      key: 'public_execution',
      teamId: beaten.teamId,
      opponentId: beaten.opponentId,
      metricValue: f1(margin),
      headline: `Beaten by ${f1(margin)}. This was not a contest.`,
      supporting: [{ label: 'Final', value: `${f1(beaten.score)}–${f1(beaten.against)}` }],
    })
  }

  return awards
}

/** Season tallies — who collects which award most often (§22.7). */
export function computeAwardLeaderboard(
  all: AwardMatchup[], throughWeek: number,
): Map<ComputedAwardKey, { teamId: number; count: number }[]> {
  const tally = new Map<ComputedAwardKey, Map<number, number>>()
  for (let w = 1; w <= throughWeek; w++) {
    for (const award of computeWeeklyAwards(all, w)) {
      if (!tally.has(award.key)) tally.set(award.key, new Map())
      const inner = tally.get(award.key)!
      inner.set(award.teamId, (inner.get(award.teamId) ?? 0) + 1)
    }
  }

  const out = new Map<ComputedAwardKey, { teamId: number; count: number }[]>()
  for (const [key, inner] of tally) {
    out.set(key, [...inner.entries()]
      .map(([teamId, count]) => ({ teamId, count }))
      .sort((a, b) => b.count - a.count))
  }
  return out
}

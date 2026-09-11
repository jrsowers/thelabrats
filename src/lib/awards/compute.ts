/**
 * Award computation.
 *
 * Pure and deterministic (§22.8): every award is derived from stored data and
 * regenerable, so a failed sync delays an award but never loses it. Nothing is
 * written — the awards table stays empty by design.
 *
 * SCOPE: team scores, ESPN's pregame projections, and per-player scoring lines.
 * The two awards that still fall back to sample values are The Mastermind and
 * The Bench Bum: both need a slot-aware lineup optimizer, which is a
 * constrained assignment problem rather than a sort, and both are wrong if
 * solved greedily in a superflex league. The two transaction-driven awards are
 * likewise still pending.
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
  /** ESPN's pregame projection. Null before ESPN publishes one. */
  homeProjected?: number | null
  awayProjected?: number | null
}

/** One player's line for the week, from player_week_scores. */
export interface AwardPlayer {
  seasonTeamId: number
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
  isStarter: boolean
  /**
   * Null when the player's game has not kicked off. NOT the same as zero, and
   * treating it as zero would hand The Prime Specimen to whoever happens to be
   * playing on Thursday.
   */
  actualPoints: number | null
  projectedPoints: number | null
}

/** Keys match catalog.ts, so no translation layer can drift. */
export type ComputedAwardKey =
  | 'cat_burglar'
  | 'dumpster_fire'
  | 'bad_beat'
  | 'public_execution'
  | 'prime_specimen'
  | 'nostradamus'
  | 'giant_killer'
  | 'choke_artist'

export interface ComputedAward {
  key: ComputedAwardKey
  /** The manager who receives it. */
  teamId: number
  /** The other side of the matchup, where relevant. */
  opponentId: number | null
  metricValue: string
  headline: string
  supporting: { label: string; value: string }[]
  /** The player the award is evidence of, for player-driven awards. */
  player?: { espnPlayerId: number; name: string; position: string; nflTeam: string }
}

const f1 = (n: number) => n.toFixed(1)

interface Side {
  teamId: number
  opponentId: number | null
  score: number
  against: number
  matchupId: number
  projected: number | null
  projectedAgainst: number | null
}

/** One row per team, which is the shape every manager award reasons over. */
function toSides(matchups: AwardMatchup[]): Side[] {
  const out: Side[] = []
  for (const m of matchups) {
    if (m.homeTeamId != null) {
      out.push({
        teamId: m.homeTeamId, opponentId: m.awayTeamId,
        score: m.homeScore, against: m.awayScore, matchupId: m.matchupId,
        projected: m.homeProjected ?? null, projectedAgainst: m.awayProjected ?? null,
      })
    }
    if (m.awayTeamId != null) {
      out.push({
        teamId: m.awayTeamId, opponentId: m.homeTeamId,
        score: m.awayScore, against: m.homeScore, matchupId: m.matchupId,
        projected: m.awayProjected ?? null, projectedAgainst: m.homeProjected ?? null,
      })
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
export function computeWeeklyAwards(
  all: AwardMatchup[],
  week: number,
  players: AwardPlayer[] = [],
): ComputedAward[] {
  // Player awards land DURING the week — the best performance of a Sunday is
  // knowable on Sunday. Matchup awards need the week finished, because "lowest
  // winning score" is meaningless while games are still being played.
  const playerAwards = computePlayerAwards(players)

  const matchups = all.filter((m) => m.week === week && m.status === 'FINAL')
  if (matchups.length === 0) return playerAwards

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

  // ---- The Giant Killer / The Choke Artist ----
  // Mirror images of one matchup: the projected underdog who won, and the
  // projected favorite who lost. Both need ESPN to have published a
  // projection, so both are skipped for a week where it never did.
  const upsets = winners
    .filter((w) => w.projected != null && w.projectedAgainst != null)
    .map((w) => ({ side: w, deficit: (w.projectedAgainst as number) - (w.projected as number) }))
    .filter((u) => u.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit)

  const upset = upsets[0]
  if (upset) {
    awards.push({
      key: 'giant_killer',
      teamId: upset.side.teamId,
      opponentId: upset.side.opponentId,
      metricValue: f1(upset.deficit),
      headline: `Projected to lose by ${f1(upset.deficit)}. Won by ${f1(upset.side.score - upset.side.against)}.`,
      supporting: [
        { label: 'Projected', value: `${f1(upset.side.projected as number)}–${f1(upset.side.projectedAgainst as number)}` },
        { label: 'Final', value: `${f1(upset.side.score)}–${f1(upset.side.against)}` },
      ],
    })

    // The award belongs to the manager it happened TO, so the same matchup
    // hands the Choke Artist to the other side rather than to the winner.
    if (upset.side.opponentId != null) {
      awards.push({
        key: 'choke_artist',
        teamId: upset.side.opponentId,
        opponentId: upset.side.teamId,
        metricValue: f1(upset.deficit),
        headline: `Projected to win by ${f1(upset.deficit)}. Lost by ${f1(upset.side.score - upset.side.against)}.`,
        supporting: [
          { label: 'Projected', value: `${f1(upset.side.projectedAgainst as number)}–${f1(upset.side.projected as number)}` },
          { label: 'Final', value: `${f1(upset.side.against)}–${f1(upset.side.score)}` },
        ],
      })
    }
  }

  return [...awards, ...playerAwards]
}

/**
 * Awards decided by a single player's line rather than by a matchup result.
 *
 * Only STARTED players count. A 30-point week from someone's bench is a Bench
 * Bum story, not a Prime Specimen one — the award is for the manager's
 * decision, and leaving him on the bench was the opposite decision.
 *
 * A player whose game has not kicked off has `actualPoints: null` and is
 * skipped. Reading that as zero would be harmless here but wrong in
 * Nostradamus, where it would score as the largest miss of the week.
 */
function computePlayerAwards(players: AwardPlayer[]): ComputedAward[] {
  const awards: ComputedAward[] = []
  const started = players.filter((p) => p.isStarter && p.actualPoints != null)
  if (started.length === 0) return awards

  const evidence = (p: AwardPlayer) => ({
    espnPlayerId: p.espnPlayerId, name: p.name, position: p.position, nflTeam: p.nflTeam,
  })

  // ---- The Prime Specimen: highest-scoring started player ----
  const best = [...started].sort((a, b) => (b.actualPoints as number) - (a.actualPoints as number))[0]
  if (best) {
    awards.push({
      key: 'prime_specimen',
      teamId: best.seasonTeamId,
      opponentId: null,
      metricValue: f1(best.actualPoints as number),
      headline: `${best.name} put up ${f1(best.actualPoints as number)} — the best in the league.`,
      supporting: [
        { label: 'Position', value: `${best.position} · ${best.nflTeam}` },
        ...(best.projectedPoints != null
          ? [{ label: 'Projected', value: f1(best.projectedPoints) }]
          : []),
      ],
      player: evidence(best),
    })
  }

  // ---- Fantasy Nostradamus: largest actual-minus-projected among starters ----
  const beats = started
    .filter((p) => p.projectedPoints != null)
    .map((p) => ({ p, over: (p.actualPoints as number) - (p.projectedPoints as number) }))
    .sort((a, b) => b.over - a.over)

  // A week where every starter missed his projection has no Nostradamus. Saying
  // so beats handing it to whoever missed by least (§22.2).
  const seer = beats[0]
  if (seer && seer.over > 0) {
    awards.push({
      key: 'nostradamus',
      teamId: seer.p.seasonTeamId,
      opponentId: null,
      metricValue: f1(seer.over),
      headline: `${seer.p.name} cleared his projection by ${f1(seer.over)}.`,
      supporting: [
        { label: 'Actual', value: f1(seer.p.actualPoints as number) },
        { label: 'Projected', value: f1(seer.p.projectedPoints as number) },
      ],
      player: evidence(seer.p),
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

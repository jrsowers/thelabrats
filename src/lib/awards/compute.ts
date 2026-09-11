/**
 * Award computation.
 *
 * Pure and deterministic (§22.8): every award is derived from stored data and
 * regenerable, so a failed sync delays an award but never loses it. Nothing is
 * written HERE — generate.ts persists the result, once per week, after Monday
 * Night Football. See release.ts for why once.
 *
 * SCOPE: team scores, ESPN's pregame projections, per-player scoring lines and
 * the week's transactions. The two awards that still fall back to sample values
 * are The Mastermind and The Bench Bum: both need a slot-aware lineup
 * optimizer, which is a constrained assignment problem rather than a sort, and
 * both are wrong if solved greedily in a superflex league.
 *
 * Every award here is won by a MANAGER, not a matchup — including the ones that
 * describe a matchup outcome. "Lost by the largest margin" belongs to the team
 * that lost it.
 */
import { NON_STARTER_SLOTS, LINEUP_SLOT } from '@/lib/espn/constants'
import { optimalLineup, startingSeats, pointsLeftOnBench } from '@/lib/lineup/optimize'

const IR_SLOT = LINEUP_SLOT.IR

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

/**
 * One roster move, from `transactions`.
 *
 * ⚠️ ONE ROW PER DECISION. ESPN records a start/sit swap as a single row with
 * two items — the player in and the player out — so counting rows counts moves
 * and counting items counts them twice.
 */
export interface AwardTransaction {
  seasonTeamId: number
  /** WAIVER, FREE_AGENT, TRADE, DROP, IR_PLACE, IR_ACTIVATE, LINEUP. */
  kind: string
  /** ESPN ids of players this move ACQUIRED. Empty for a drop or a bench move. */
  acquiredPlayerIds: number[]
}

/** One player's line for the week, from player_week_scores. */
export interface AwardPlayer {
  seasonTeamId: number
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
  isStarter: boolean
  /** ESPN slot he actually occupied. 21 is IR, which cannot be started. */
  lineupSlotId: number
  /** Slots he could legally have occupied. The optimizer's constraint set. */
  eligibleSlots: number[]
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
  | 'waiver_wire_wizard'
  | 'galaxy_brain'
  | 'mastermind'
  | 'bench_bum'

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
  transactions: AwardTransaction[] = [],
  /** ESPN's lineup_slot_counts. Without it there is no lineup to optimize. */
  slotCounts: Record<string | number, number> = {},
): ComputedAward[] {
  // Player awards land DURING the week — the best performance of a Sunday is
  // knowable on Sunday. Matchup awards need the week finished, because "lowest
  // winning score" is meaningless while games are still being played.
  const playerAwards = [
    ...computePlayerAwards(players),
    ...computeWaiverAward(players, transactions),
  ]

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

  // ---- The Mastermind / The Bench Bum ----
  // Both are the same number read from opposite ends: the gap between what a
  // manager started and the best lineup his roster allowed. Only computed on a
  // final week, which is what makes it safe to read a missing stat line as a
  // zero rather than as "has not played" — see optimalLineup.
  const lineupGaps = computeLineupGaps(players, slotCounts)

  if (lineupGaps.length > 0) {
    const tightest = lineupGaps[0]
    const loosest = lineupGaps[lineupGaps.length - 1]

    awards.push({
      key: 'mastermind',
      teamId: tightest.teamId,
      opponentId: null,
      metricValue: f1(tightest.gap),
      headline: tightest.gap === 0
        ? 'Started the best lineup his roster allowed. Nothing left behind.'
        : `Left just ${f1(tightest.gap)} on the bench — the tightest lineup of the week.`,
      supporting: [
        { label: 'Started', value: f1(tightest.started) },
        { label: 'Best possible', value: f1(tightest.best) },
      ],
    })

    // A week where everybody nailed it has no Bench Bum, and one manager
    // cannot hold both ends of the same measure.
    if (loosest.teamId !== tightest.teamId && loosest.gap > 0) {
      awards.push({
        key: 'bench_bum',
        teamId: loosest.teamId,
        opponentId: null,
        metricValue: f1(loosest.gap),
        headline: `Left ${f1(loosest.gap)} points sitting on the bench.`,
        supporting: [
          { label: 'Started', value: f1(loosest.started) },
          { label: 'Best possible', value: f1(loosest.best) },
          ...(loosest.missed
            ? [{ label: 'Should have started', value: loosest.missed }]
            : []),
        ],
      })
    }
  }

  // ---- The Galaxy Brain: most roster moves, among managers who lost ----
  // "Roster moves" is every decision the manager made inside the scoring
  // period: waiver claims, free agent adds, drops, trades, IR moves and
  // start/sit swaps. ESPN scopes each transaction to a period itself, which is
  // the league's own Wednesday-waivers-to-Monday-night boundary — better than
  // any window we could define.
  const movesByTeam = new Map<number, Map<string, number>>()
  for (const t of transactions) {
    const kinds = movesByTeam.get(t.seasonTeamId) ?? new Map<string, number>()
    kinds.set(t.kind, (kinds.get(t.kind) ?? 0) + 1)
    movesByTeam.set(t.seasonTeamId, kinds)
  }
  const totalMoves = (teamId: number) =>
    [...(movesByTeam.get(teamId)?.values() ?? [])].reduce((n, c) => n + c, 0)

  const busiest = [...losers]
    .map((s) => ({ side: s, moves: totalMoves(s.teamId) }))
    .filter((x) => x.moves > 0)
    .sort((a, b) => b.moves - a.moves)[0]

  // A week where every loser stood pat has no Galaxy Brain, and saying so beats
  // handing it to someone who made a single move (§22.2).
  if (busiest && busiest.moves > 1) {
    const kinds = movesByTeam.get(busiest.side.teamId) ?? new Map()
    awards.push({
      key: 'galaxy_brain',
      teamId: busiest.side.teamId,
      opponentId: busiest.side.opponentId,
      metricValue: String(busiest.moves),
      headline: `${busiest.moves} roster moves. Still lost by ${f1(busiest.side.against - busiest.side.score)}.`,
      // The breakdown, so nobody has to guess what counted as a move.
      supporting: [
        ...MOVE_LABELS
          .filter(([kind]) => (kinds.get(kind) ?? 0) > 0)
          .map(([kind, label]) => ({ label, value: String(kinds.get(kind)) })),
        { label: 'Final', value: `${f1(busiest.side.score)}–${f1(busiest.side.against)}` },
      ],
    })
  }

  return [...awards, ...playerAwards]
}

interface LineupGap {
  teamId: number
  /** What the manager's starters actually scored. */
  started: number
  /** What the best legal lineup would have scored. */
  best: number
  gap: number
  /** The benched player who should have started, for the card. */
  missed: string | null
}

/**
 * Every manager's gap between the lineup started and the best one available,
 * ascending — tightest first.
 *
 * ⚠️ IR PLAYERS ARE NOT CANDIDATES. A player on injured reserve cannot be
 * started, whatever his eligible slots say, so including him would invent a
 * lineup nobody was allowed to field and hand The Bench Bum to whoever had the
 * unluckiest injury.
 *
 * ⚠️ A MISSING STAT LINE IS ZERO HERE. Everywhere else in this engine it means
 * "has not kicked off"; this runs only on a final week, where it means he did
 * not score. Treating it as unknown would quietly drop eligible players out of
 * the optimal lineup and understate every gap.
 */
function computeLineupGaps(
  players: AwardPlayer[],
  slotCounts: Record<string | number, number>,
): LineupGap[] {
  const seats = startingSeats(slotCounts, NON_STARTER_SLOTS)
  if (seats.length === 0 || players.length === 0) return []

  const byTeam = new Map<number, AwardPlayer[]>()
  for (const p of players) {
    const roster = byTeam.get(p.seasonTeamId) ?? []
    roster.push(p)
    byTeam.set(p.seasonTeamId, roster)
  }

  const gaps: LineupGap[] = []
  for (const [teamId, roster] of byTeam) {
    // Without eligibility there is no constraint set, and an "optimal" lineup
    // computed from nothing would be a fabricated number on a real card.
    if (roster.every((p) => p.eligibleSlots.length === 0)) continue

    const candidates = roster
      .filter((p) => p.lineupSlotId !== IR_SLOT && p.eligibleSlots.length > 0)
      .map((p) => ({
        espnPlayerId: p.espnPlayerId,
        name: p.name,
        points: p.actualPoints ?? 0,
        eligibleSlots: p.eligibleSlots,
      }))

    const started = roster
      .filter((p) => p.isStarter)
      .reduce((n, p) => n + (p.actualPoints ?? 0), 0)

    const optimal = optimalLineup(candidates, seats)
    const gap = pointsLeftOnBench(optimal.total, started)

    // The single biggest miss: the highest scorer the optimizer would have
    // started who was actually on the bench.
    const startedIds = new Set(roster.filter((p) => p.isStarter).map((p) => p.espnPlayerId))
    const missed = optimal.assignments
      .map((a) => a.player)
      .filter((p) => !startedIds.has(p.espnPlayerId))
      .sort((a, b) => b.points - a.points)[0]

    gaps.push({
      teamId,
      started,
      best: optimal.total,
      gap,
      missed: missed ? `${missed.name} (${f1(missed.points)})` : null,
    })
  }

  // Ties break on team id so the same week always names the same manager.
  return gaps.sort((a, b) => a.gap - b.gap || a.teamId - b.teamId)
}

/** Display order and wording for the Galaxy Brain breakdown. */
const MOVE_LABELS: [string, string][] = [
  ['WAIVER', 'Waiver claims'],
  ['FREE_AGENT', 'Free agents'],
  ['TRADE', 'Trades'],
  ['DROP', 'Drops'],
  ['LINEUP', 'Lineup changes'],
  ['IR_PLACE', 'To IR'],
  ['IR_ACTIVATE', 'From IR'],
]

/**
 * The Waiver Wire Wizard: the highest-scoring player acquired this week.
 *
 * Credited to the manager who claimed him, per the catalog formula — which
 * deliberately does NOT require that the pickup was started. "Grabbed the
 * highest scoring free agent" is the claim being made, and a manager who
 * correctly identified him has done the hard part even if he sat. Whether he
 * started is shown on the card instead of silently deciding it.
 *
 * Trades are excluded: acquiring a player by trade is a different skill, and
 * The Cat Burglar is not this award.
 */
function computeWaiverAward(
  players: AwardPlayer[],
  transactions: AwardTransaction[],
): ComputedAward[] {
  const pickups = new Map<number, number>()
  for (const t of transactions) {
    if (t.kind !== 'WAIVER' && t.kind !== 'FREE_AGENT') continue
    for (const id of t.acquiredPlayerIds) pickups.set(id, t.seasonTeamId)
  }
  if (pickups.size === 0) return []

  const scored = players
    .filter((p) => pickups.has(p.espnPlayerId) && p.actualPoints != null)
    // The team that CLAIMED him, which is not always the team he ended the
    // week on — a pickup can be dropped again days later.
    .map((p) => ({ p, teamId: pickups.get(p.espnPlayerId) as number }))
    .sort((a, b) => (b.p.actualPoints as number) - (a.p.actualPoints as number))

  const best = scored[0]
  if (!best) return []

  return [{
    key: 'waiver_wire_wizard',
    teamId: best.teamId,
    opponentId: null,
    metricValue: f1(best.p.actualPoints as number),
    headline: `${best.p.name} scored ${f1(best.p.actualPoints as number)} after being picked up this week.`,
    supporting: [
      { label: 'Position', value: `${best.p.position} · ${best.p.nflTeam}` },
      { label: 'Lineup', value: best.p.isStarter ? 'Started' : 'Benched' },
      ...(best.p.projectedPoints != null
        ? [{ label: 'Projected', value: f1(best.p.projectedPoints) }]
        : []),
    ],
    player: {
      espnPlayerId: best.p.espnPlayerId, name: best.p.name,
      position: best.p.position, nflTeam: best.p.nflTeam,
    },
  }]
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

import type {
  DraftablePlayer, RawPick, TeamMeta, PickAnalysis, PickFlag,
} from './types'

/**
 * Deterministic draft analysis.
 *
 * Every number a roast can cite is computed here and unit-tested. The writing
 * layer receives these facts and may only phrase them — it never derives one.
 * That is the same contract the awards engine works under, and it is what stops
 * a bot from confidently inventing a reach that did not happen.
 */

const SUPERFLEX_QB_SLOTS = 2 // QB + OP. A team wanting both needs two real QBs.
const RUN_WINDOW = 5

/** ESPN's placeholder for a pick that has not happened yet. */
export const UNMADE_PICK = -1

/**
 * A reach is measured by how many BETTER players were still on the board, not
 * by rank-minus-pick. Ranks are a static preseason list: by round 9 everyone
 * ranked under 100 is gone, so rank-minus-pick makes literally every late pick
 * look like a massive reach. "Twenty better players were sitting there" is true
 * in round 1 and round 15 alike.
 */
const REACH = { MASSIVE: 25, NOTABLE: 12 }

/** Value still reads cleanly off rank: he lasted well past where he was ranked. */
const VALUE = { MASSIVE: -25, NOTABLE: -12 }

/** Preseason QUESTIONABLE covers 122 players. Only real absence is notable. */
const SERIOUS_INJURY = new Set(['INJURY_RESERVE', 'OUT', 'SUSPENSION'])

export interface AnalyzeInput {
  picks: RawPick[]
  playersById: Map<number, DraftablePlayer>
  teamsById: Map<number, TeamMeta>
  /** Rounds in the draft, for late-round judgements. */
  totalRounds: number
}

export function analyzeDraft({
  picks, playersById, teamsById, totalRounds,
}: AnalyzeInput): PickAnalysis[] {
  // An UNMADE pick is exactly -1. It is NOT "any non-positive id": ESPN gives
  // every D/ST a negative playerId (Seahawks D/ST is -16026), so `playerId > 0`
  // silently drops all twelve defence picks and the early-D/ST flag never fires.
  const made = picks
    .filter((p) => p.playerId !== UNMADE_PICK)
    .sort((a, b) => a.overallPickNumber - b.overallPickNumber)

  // Board of everyone not yet taken, best superflex rank first.
  const takenIds = new Set<number>()
  const board = [...playersById.values()].sort((a, b) => a.superflexRank - b.superflexRank)

  const roster = new Map<number, Record<string, number>>()
  const seenPositions = new Set<string>()
  const out: PickAnalysis[] = []

  for (const pick of made) {
    const player = playersById.get(pick.playerId)
    const team = teamsById.get(pick.teamId)
    if (!player || !team) continue

    // Board state BEFORE this pick is removed.
    const remaining = board.filter((p) => !takenIds.has(p.id))
    const bestAvailable = remaining[0] ?? null

    // Anyone clearly better still sitting there. Ranked better by a real
    // margin, so a one-slot difference is not treated as a blunder.
    const better = remaining.filter(
      (p) => p.id !== player.id && p.superflexRank < player.superflexRank,
    )
    const betterAvailable = better.length
    const passedOver = better.slice(0, 3)

    takenIds.add(player.id)

    const counts = roster.get(pick.teamId) ?? { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }
    counts[player.pos] = (counts[player.pos] ?? 0) + 1
    roster.set(pick.teamId, counts)

    // Earlier picks by THIS manager, for handcuff and stacking detection.
    const own = out.filter((a) => a.team.teamId === pick.teamId)
    const sameProTeam = player.proTeam
      ? own.filter((a) => a.player.proTeam === player.proTeam).map((a) => a.player)
      : []
    const handcuff = sameProTeam.some((p) => p.pos === player.pos)

    const recent = out.slice(-RUN_WINDOW)
    const positionRun = recent.filter((a) => a.player.pos === player.pos).length

    const firstAtPosition = !seenPositions.has(player.pos)
    seenPositions.add(player.pos)

    // Slots EARLIER than the board had him. Taking the 40th-ranked player at
    // pick 1 is a 39-slot reach, so rank comes first: 40 - 1 = +39. Getting the
    // 5th-ranked player at pick 30 is value: 5 - 30 = -25.
    const reachSlots = player.superflexRank - pick.overallPickNumber
    const adpSlots = Math.round((player.adp - pick.overallPickNumber) * 10) / 10

    const flags: PickFlag[] = []
    if (betterAvailable >= REACH.MASSIVE) flags.push('MASSIVE_REACH')
    else if (betterAvailable >= REACH.NOTABLE) flags.push('REACH')
    else if (betterAvailable === 0) flags.push('BEST_AVAILABLE')

    if (reachSlots <= VALUE.MASSIVE) flags.push('MASSIVE_VALUE')
    else if (reachSlots <= VALUE.NOTABLE) flags.push('VALUE')

    // Only a burn if the player left behind is genuinely far better.
    if (betterAvailable >= REACH.NOTABLE
        && passedOver.some((p) => p.superflexRank < player.superflexRank - 15)) {
      flags.push('PASSED_ON_STUD')
    }
    if (positionRun >= 3) flags.push('POSITION_RUN')
    if (firstAtPosition && player.pos === 'K') flags.push('FIRST_KICKER')
    if (firstAtPosition && player.pos === 'DST') flags.push('FIRST_DST')

    // A kicker or defence before the last two rounds is a choice.
    const lateRoundStart = totalRounds - 1
    if (player.pos === 'K' && pick.roundId < lateRoundStart) flags.push('EARLY_KICKER')
    if (player.pos === 'DST' && pick.roundId < lateRoundStart) flags.push('EARLY_DST')

    // Superflex punishes QB neglect specifically, so it gets its own flag.
    if (counts.QB < SUPERFLEX_QB_SLOTS && pick.roundId >= 8 && player.pos !== 'QB') {
      flags.push('NO_QB_LATE')
    }
    if ((counts.WR ?? 0) >= 5 && player.pos === 'WR') flags.push('ROSTER_IMBALANCE')
    if ((counts.RB ?? 0) >= 5 && player.pos === 'RB') flags.push('ROSTER_IMBALANCE')

    if (pick.autoDraftTypeId > 0) flags.push('AUTODRAFTED')
    if (player.injuryStatus && SERIOUS_INJURY.has(player.injuryStatus)) flags.push('INJURED')
    if (reachSlots <= VALUE.NOTABLE && pick.roundId >= 3) flags.push('ON_THE_CLOCK_STEAL')

    out.push({
      overallPickNumber: pick.overallPickNumber,
      round: pick.roundId,
      roundPick: pick.roundPickNumber,
      team, player,
      reachSlots, adpSlots,
      autodrafted: pick.autoDraftTypeId > 0,
      bestAvailable: bestAvailable?.id === player.id ? null : bestAvailable,
      betterAvailable,
      passedOver,
      rosterAfter: { ...counts },
      sameProTeamAlreadyRostered: sameProTeam.map((p) => p.name),
      isHandcuff: handcuff,
      positionRun,
      firstAtPosition,
      notability: notabilityOf({ betterAvailable, reachSlots, flags, round: pick.roundId, totalRounds }),
      flags,
    })
  }

  return out
}

/**
 * How much this pick deserves a comment.
 *
 * 180 picks is far too many to roast. Rounds 11-15 are kickers and handcuffs;
 * a bot that forces a joke about every one of them is exhausting. This scores
 * each pick so only the genuinely notable ones get written up.
 */
function notabilityOf({
  betterAvailable, reachSlots, flags, round, totalRounds,
}: {
  betterAvailable: number; reachSlots: number
  flags: PickFlag[]; round: number; totalRounds: number
}): number {
  let score = 0
  score += Math.min(30, betterAvailable * 0.8)
  if (reachSlots < 0) score += Math.min(20, Math.abs(reachSlots) * 0.7)

  const weights: Partial<Record<PickFlag, number>> = {
    MASSIVE_REACH: 18, MASSIVE_VALUE: 16, PASSED_ON_STUD: 14,
    EARLY_KICKER: 34, EARLY_DST: 26, POSITION_RUN: 8,
    FIRST_KICKER: 10, FIRST_DST: 8, NO_QB_LATE: 14,
    ROSTER_IMBALANCE: 12, AUTODRAFTED: 18, INJURED: 14,
    REACH: 4, VALUE: 4, ON_THE_CLOCK_STEAL: 3, BEST_AVAILABLE: 0,
  }
  for (const f of flags) score += weights[f] ?? 0

  // Round 1 is inherently interesting; the dead rounds are not.
  if (round === 1) score += 14
  else if (round === 2) score += 6
  if (round >= totalRounds - 2) score -= 16

  return Math.max(0, Math.min(100, Math.round(score)))
}

export interface SelectOptions {
  /** Floor for a pick to be worth a comment at all. */
  minNotability?: number
  /** Nobody gets pile-driven. */
  maxPerTeam?: number
  /**
   * Every manager gets roasted at least once, even if they drafted cleanly.
   * In a league of friends, being ignored is worse than being roasted.
   */
  guaranteeEveryTeam?: boolean
}

/**
 * The picks worth writing about.
 *
 * 180 picks is far more than anyone wants to read. This keeps the genuinely
 * notable ones, spreads them across the league, and makes sure no manager
 * escapes the draft without at least one comment.
 */
export function selectRoastable(
  all: PickAnalysis[],
  { minNotability = 22, maxPerTeam = 4, guaranteeEveryTeam = true }: SelectOptions = {},
): PickAnalysis[] {
  const byNotability = [...all].sort((a, b) => b.notability - a.notability)

  const perTeam = new Map<number, number>()
  const chosen = new Set<PickAnalysis>()

  for (const p of byNotability) {
    if (p.notability < minNotability) break
    const n = perTeam.get(p.team.teamId) ?? 0
    if (n >= maxPerTeam) continue
    perTeam.set(p.team.teamId, n + 1)
    chosen.add(p)
  }

  if (guaranteeEveryTeam) {
    const teamIds = new Set(all.map((p) => p.team.teamId))
    for (const teamId of teamIds) {
      if ((perTeam.get(teamId) ?? 0) > 0) continue
      const best = byNotability.find((p) => p.team.teamId === teamId)
      if (best) { chosen.add(best); perTeam.set(teamId, 1) }
    }
  }

  // Back into draft order — a feed reads chronologically.
  return [...chosen].sort((a, b) => a.overallPickNumber - b.overallPickNumber)
}

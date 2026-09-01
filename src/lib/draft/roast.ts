import type { PickAnalysis } from './types'

/**
 * The writing layer.
 *
 * Receives computed facts and phrases them. It never derives a number — every
 * figure it can cite already exists on PickAnalysis, verified by
 * tests/draft-analyze.test.ts. Same contract the awards commentary works under.
 *
 * Voice per SOUL.md: roast the DECISION, never the person. "That pick was a
 * crime" is in bounds. Anything about the human who made it is not.
 */

export interface RoastContext { pick: PickAnalysis; leagueName: string }

/** The facts a writer is allowed to use, flattened for a prompt. */
export function factSheet(p: PickAnalysis): Record<string, string | number | boolean> {
  return {
    pick: p.overallPickNumber,
    round: p.round,
    roundPick: p.roundPick,
    manager: p.team.managerFirst,
    team: p.team.teamName,
    player: p.player.name,
    position: p.player.pos,
    superflexRank: p.player.superflexRank,
    nationalADP: p.player.adp,
    slotsEarlierThanRank: p.reachSlots,
    slotsEarlierThanNationalADP: p.adpSlots,
    betterPlayersStillAvailable: p.betterAvailable,
    bestPlayerPassedOver: p.bestAvailable?.name ?? 'none',
    bestPassedOverRank: p.bestAvailable?.superflexRank ?? 0,
    othersPassedOver: p.passedOver.map((x) => x.name).join(', ') || 'none',
    rosterSoFar: Object.entries(p.rosterAfter)
      .filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', '),
    samePositionInLast5: p.positionRun,
    firstOfPositionInDraft: p.firstAtPosition,
    autodrafted: p.autodrafted,
    injuryStatus: p.player.injuryStatus ?? 'healthy',
    flags: p.flags.join(', '),
  }
}

export const ROAST_SYSTEM = `You write one-line roasts for a 12-team superflex fantasy football league called The Lab Rats. You are the league's resident smartass.

RULES
- ONE sentence. Two only if the second is a very short kicker. Under 30 words.
- Roast the DECISION, never the person. Never comment on anyone's looks, job, family, intelligence, or character.
- Use ONLY the numbers in the fact sheet. Never invent a stat, ranking, or projection.
- This is SUPERFLEX: two QBs start. Taking QBs early is correct, not funny. Never mock a QB pick for being early unless betterPlayersStillAvailable is high.
- nationalADP is standard-league ADP. It is the punchline ("the rest of America"), never the yardstick. The yardstick is superflexRank and betterPlayersStillAvailable.
- Be specific. Name the player passed over. A number lands harder than an adjective.
- Vary your structure. Do not start consecutive roasts the same way.
- Dry and deadpan beats zany. No emoji. No exclamation marks.`

/**
 * Deterministic fallback.
 *
 * Used when no model is configured and when a generation fails mid-draft. It is
 * plainly worse than the model — the same shapes repeat — but a repetitive line
 * beats a hole in the feed while 12 people are watching.
 */
export function templateRoast(p: PickAnalysis): string {
  const m = p.team.managerFirst
  const player = p.player.name
  const passed = p.bestAvailable?.name

  if (p.flags.includes('EARLY_KICKER')) {
    return `${m} took a kicker in round ${p.round}. There were ${p.betterAvailable} better players available. A kicker.`
  }
  if (p.flags.includes('EARLY_DST')) {
    return `${m} spent round ${p.round} on a defense with ${p.betterAvailable} real players still on the board.`
  }
  if (p.flags.includes('AUTODRAFTED')) {
    return `${m} let the robot take ${player}. The robot is now managing this team better than ${m} was.`
  }
  if (p.flags.includes('MASSIVE_REACH') && passed) {
    return `${m} took ${player} at ${p.overallPickNumber} with ${p.betterAvailable} better players available, including ${passed}.`
  }
  if (p.flags.includes('MASSIVE_VALUE')) {
    return `${player} fell ${Math.abs(p.reachSlots)} slots past his rank and ${m} finally ended it at pick ${p.overallPickNumber}.`
  }
  if (p.flags.includes('NO_QB_LATE')) {
    return `Round ${p.round} and ${m} still has ${p.rosterAfter.QB} quarterback${p.rosterAfter.QB === 1 ? '' : 's'} in a superflex league. Bold.`
  }
  if (p.flags.includes('ROSTER_IMBALANCE')) {
    const pos = p.player.pos
    return `That is ${m}'s ${p.rosterAfter[pos]}th ${pos}. At some point this stops being a strategy.`
  }
  if (p.flags.includes('POSITION_RUN')) {
    return `${p.positionRun} of the last 5 picks were ${p.player.pos}s, and ${m} jumped in for ${player}.`
  }
  if (p.flags.includes('INJURED')) {
    return `${m} used pick ${p.overallPickNumber} on ${player}, whose current status is ${p.player.injuryStatus}.`
  }
  if (p.flags.includes('BEST_AVAILABLE')) {
    return `${m} took the best player on the board. Suspiciously competent.`
  }
  return `${m} took ${player} at ${p.overallPickNumber}. The superflex board had him ${p.player.superflexRank}.`
}

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

/**
 * The facts a writer may use.
 *
 * ORDER MATTERS. The first version led with rank, ADP and slot deltas, and the
 * roasts came back obsessed with them — "twenty-two better guys walked past"
 * is a real fact and a bad joke, because almost nobody cares about ADP.
 *
 * So the sheet now leads with the two things that ARE funny: who this player
 * is, and what he does to the roster. The numbers still exist, at the bottom,
 * available as a punchline rather than a premise.
 */
export function factSheet(p: PickAnalysis): Record<string, string | number | boolean> {
  const r = p.rosterAfter
  const shape = Object.entries(r).filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`).join(', ')

  const problems: string[] = []
  if ((r.QB ?? 0) < 2 && p.round >= 5) {
    problems.push(`only ${r.QB ?? 0} QB in a format that starts TWO`)
  }
  if ((r.TE ?? 0) >= 2) problems.push(`${r.TE} TEs and only one TE slot`)
  if ((r.K ?? 0) >= 1 && p.round <= 12) problems.push('a kicker this early')
  if ((r.DST ?? 0) >= 1 && p.round <= 11) problems.push('a defense this early')
  if ((r.WR ?? 0) >= 5) problems.push(`${r.WR} WRs for two starting slots plus a flex`)
  if ((r.RB ?? 0) >= 5) problems.push(`${r.RB} RBs for two starting slots plus a flex`)

  return {
    // --- who and what happened
    manager: p.team.managerFirst,
    team: p.team.teamName,
    player: p.player.name,
    position: p.player.pos,
    nflTeam: p.player.proTeam ?? 'unknown',
    round: p.round,

    // --- THE PLAYER. His story is the first place to look for a joke.
    playerStory: p.player.outlook ?? 'no analyst blurb available',
    injuryStatus: p.player.injuryStatus ?? 'healthy',

    // --- THE ROSTER. The second place to look.
    rosterAfterThisPick: shape,
    rosterProblems: problems.join('; ') || 'none worth mentioning',
    startingSlots: 'QB, RB, RB, WR, WR, TE, FLEX, OP (any offensive player, usually a 2nd QB), DST, K',
    benchSpots: 5,

    // --- WHO HE PASSED ON. Names land; ranks do not.
    bestPlayerPassedOver: p.bestAvailable?.name ?? 'nobody better',
    othersPassedOver: p.passedOver.map((x) => `${x.name} (${x.pos})`).join(', ') || 'none',

    // --- NUMBERS. Available, but they are the punchline, never the premise.
    // Use AT MOST ONE, and only if it is genuinely funnier than the player.
    overallPickNumber: p.overallPickNumber,
    betterPlayersStillAvailable: p.betterAvailable,
    nationalADP: p.player.adp >= 9999 ? 'n/a' : p.player.adp,

    autodrafted: p.autodrafted,
    flags: p.flags.join(', '),
  }
}

export const ROAST_SYSTEM = `You write one-line roasts for a 12-team superflex fantasy football league called The Lab Rats. You are the league's resident smartass.

RULES
- ONE sentence. Two only if the second is a very short kicker. Under 30 words.
- Roast the DECISION, never the person. Never comment on anyone's looks, job, family, intelligence, or character.
- Use ONLY the numbers in the fact sheet. Never invent a stat, ranking, or projection.
- This is SUPERFLEX: two QBs start. Taking QBs early is correct, not funny. Never mock a QB pick for being early unless betterPlayersStillAvailable is high.
- nationalADP is standard-league ADP. It is the punchline ("the rest of America"), never the yardstick. The yardstick is leagueRank and betterPlayersStillAvailable.
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
  return `${m} took ${player} at ${p.overallPickNumber}. The superflex board had him ${p.player.leagueRank}.`
}

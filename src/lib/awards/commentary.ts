/**
 * Award commentary.
 *
 * Every card carries one sentence naming the manager, the player or opponent
 * involved, and the number that earned it — with the details in bold. Player
 * and opponent chips were removed in favour of this, so every card has the same
 * shape regardless of what kind of award it is.
 *
 * ONE builder serves both real and sample awards, so the voice cannot diverge
 * between what you see before week 1 and what you see after it.
 *
 * Voice per SOUL.md: roast the decision, never the person.
 */

export interface Segment { text: string; bold?: boolean }

export interface CommentaryContext {
  /** First name only — the league talks about each other by first name. */
  managerFirst: string
  teamName: string
  opponentTeam?: string | null
  opponentManager?: string | null
  playerName?: string | null
  /** e.g. "QB - DET" */
  playerMeta?: string | null
  /** The headline number, already formatted. */
  value: string
  extra?: Record<string, string>
}

const b = (text: string): Segment => ({ text, bold: true })
const t = (text: string): Segment => ({ text })

/** "Jared Goff (QB - DET)" as bold name + plain meta. */
function player(ctx: CommentaryContext): Segment[] {
  if (!ctx.playerName) return [b('his flex play')]
  return ctx.playerMeta
    ? [b(ctx.playerName), t(` (${ctx.playerMeta})`)]
    : [b(ctx.playerName)]
}

/** "Mr. Anderson (Jesse Anderson)" as bold team + plain manager. */
function opponent(ctx: CommentaryContext): Segment[] {
  if (!ctx.opponentTeam) return [b('his opponent')]
  return ctx.opponentManager
    ? [b(ctx.opponentTeam), t(` (${ctx.opponentManager})`)]
    : [b(ctx.opponentTeam)]
}

type Builder = (ctx: CommentaryContext) => Segment[]

const BUILDERS: Record<string, Builder> = {
  // ---- STUDS ----
  mastermind: (c) => [
    b(c.managerFirst), t(' left just '), b(`${c.value} points`),
    t(' on the bench — the tightest lineup anyone put out this week. Surgical.'),
  ],
  waiver_wire_wizard: (c) => [
    b(c.managerFirst), t(' picked up '), ...player(c),
    t(' off the wire and he went off for '), b(`${c.value} pts`), t('. Slay, king!'),
  ],
  nostradamus: (c) => [
    t('Nobody else wanted '), ...player(c), t('. '), b(c.managerFirst),
    t(' started him anyway and cleared projection by '), b(c.value), t('. Seer behaviour.'),
  ],
  cat_burglar: (c) => [
    b(c.managerFirst), t(' won with just '), b(`${c.value} points`),
    t(' — the lowest winning score of the week. Took it from '), ...opponent(c),
    t(' and left no fingerprints.'),
  ],
  giant_killer: (c) => [
    b(c.managerFirst), t(' was projected to lose to '), ...opponent(c), t(' by '),
    b(c.value), t('. Won anyway. Somebody check the tape.'),
  ],
  prime_specimen: (c) => [
    b(c.managerFirst), t(' started '), ...player(c), t(' and watched him drop '),
    b(`${c.value} pts`), t(' — the best performance in the league this week.'),
  ],

  // ---- DUDS ----
  dumpster_fire: (c) => [
    b(c.managerFirst), t(' managed '), b(`${c.value} points`),
    t('. Nobody in the entire league did worse. Somebody get the extinguisher.'),
  ],
  choke_artist: (c) => [
    b(c.managerFirst), t(' was projected to beat '), ...opponent(c), t(' by '),
    b(c.value), t('. Lost. Not a single thing went to plan.'),
  ],
  bad_beat: (c) => [
    b(c.managerFirst), t(' scored '), b(c.value), t(' and still lost to '),
    ...opponent(c), t('. That total would have beaten every other team this week.'),
  ],
  public_execution: (c) => [
    b(c.managerFirst), t(' lost to '), ...opponent(c), t(' by '),
    b(`${c.value} points`), t('. Guess his team forgot to get off the bus!'),
  ],
  bench_bum: (c) => [
    b(c.managerFirst), t(' left '), b(`${c.value} points`),
    t(' sitting on the bench. The winning lineup was right there the whole time.'),
  ],
  galaxy_brain: (c) => [
    b(c.managerFirst), t(' made '), b(`${c.value} roster moves`),
    t(' this week and still lost to '), ...opponent(c),
    t('. Sometimes the big brain is the problem.'),
  ],
}

export function buildCommentary(key: string, ctx: CommentaryContext): Segment[] {
  const builder = BUILDERS[key]
  if (!builder) return [b(ctx.managerFirst), t(` — ${ctx.value}.`)]
  return builder(ctx)
}

/** Managers are referred to by first name throughout. */
export const firstName = (full: string | null | undefined) =>
  (full ?? '').trim().split(/\s+/)[0] || 'Somebody'

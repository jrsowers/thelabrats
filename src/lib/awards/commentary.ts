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

/**
 * ⚠️ MANAGERS TAKE THEY/THEM. This league is gender diverse, and a template
 * cannot know who will win an award — "what he was projected to score" went
 * out on the live page under Bree Noble's name before anyone caught it.
 *
 * NFL players are a different case: the league's player pool is all men, so
 * "he went off for 13.5" about a wide receiver is accurate rather than assumed.
 * Every gendered pronoun below refers to a PLAYER, and the test in
 * tests/awards.test.ts holds that line for any award with no player on the
 * card.
 */
const b = (text: string): Segment => ({ text, bold: true })
const t = (text: string): Segment => ({ text })

/** "Jared Goff (QB - DET)" as bold name + plain meta. */
function player(ctx: CommentaryContext): Segment[] {
  if (!ctx.playerName) return [b('the flex play')]
  return ctx.playerMeta
    ? [b(ctx.playerName), t(` (${ctx.playerMeta})`)]
    : [b(ctx.playerName)]
}

/** "Mr. Anderson (Jesse Anderson)" as bold team + plain manager. */
function opponent(ctx: CommentaryContext): Segment[] {
  if (!ctx.opponentTeam) return [b('their opponent')]
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
    t(' started him anyway and cleared projection by '), b(c.value), t('. Seer behavior.'),
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
  control_group: (c) => [
    b(c.managerFirst), t(' finished within '), b(c.value),
    t(' of exactly what they were projected to score. No drama, no disasters, '),
    t('nothing to talk about. The scientific method in team form.'),
  ],
  photo_finish: (c) => [
    b(c.managerFirst), t(' beat '), ...opponent(c), t(' by '), b(c.value),
    t('. Any closer and they would have needed a steward\'s inquiry.'),
  ],
  socialist: (c) => [
    t('The worst starter '), b(c.managerFirst), t(' put out still scored '),
    b(c.value), t('. No holes, no passengers, nobody having a quiet one. '),
    t('From each according to their ability, and all that.'),
  ],
  one_man_army: (c) => [
    ...player(c), t(' was '), b(c.value), t(' of the score that won it for '),
    b(c.managerFirst), t('. The other nine turned up and watched.'),
  ],
  slay_girl_slay: (c) => [
    b(c.managerFirst), t(' had '), b(`${c.value} starters`),
    t(' clear their projection. Not one weak link in the whole lineup. '),
    t('Absolutely no notes.'),
  ],
  sweatin_it_out: (c) => [
    b(c.managerFirst), t(' was down '), b(c.value), t(' to '), ...opponent(c),
    t(' and won anyway. Somewhere a remote control did not survive.'),
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
    b(`${c.value} points`), t('. Guess their team forgot to get off the bus!'),
  ],
  bench_bum: (c) => [
    b(c.managerFirst), t(' left '), b(`${c.value} points`),
    t(' sitting on the bench. The winning lineup was right there the whole time.'),
  ],
  free_fall: (c) => [
    b(c.managerFirst), t(' fell '), b(`${c.value} places`),
    t(' in the table this week. Same league, longer way down.'),
  ],
  understudy: (c) => [
    ...player(c), t(' put up '), b(`${c.value} pts`), t(' for '), b(c.managerFirst),
    t(' and did it in street clothes. Best seat in the house.'),
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

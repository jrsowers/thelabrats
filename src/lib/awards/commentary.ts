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
import { pronounsFor } from '@/content/managers'

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
 * ⚠️ MANAGERS TAKE THEIR OWN PRONOUNS, FROM `src/content/managers.ts`.
 *
 * These templates used they/them for everybody, because manager pronouns were
 * unknown and a template cannot know who will win an award — "of exactly what
 * he was projected to score" once shipped to the live page under Bree Noble's
 * name. James supplied the real list on 2026-09-15 and asked for the engine to
 * use it, so the pronoun is resolved per recipient from `ctx.managerFirst`.
 *
 * This DOES rewrite copy on already-published award cards, which is normally
 * the drift §22.8 exists to prevent. Accepted deliberately: commentary has
 * always been built at render time rather than stored, the change makes the
 * cards more accurate rather than less, and James called it explicitly.
 *
 * `pronounsFor` falls back to they/them for anyone not in the table, so a new
 * manager reads neutrally instead of being guessed at. Never infer a pronoun
 * from a name.
 *
 * NFL players are a separate case and always were: that pool is all men, so
 * "he went off for 13.5" about a receiver is accurate rather than assumed.
 */

/** The recipient's pronouns. Every award already carries the name it is about. */
const pron = (c: CommentaryContext) => pronounsFor(c.managerFirst)

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
  if (!ctx.opponentTeam) return [b(`${pronounsFor(ctx.managerFirst).possessive} opponent`)]
  return ctx.opponentManager
    ? [b(ctx.opponentTeam), t(` (${ctx.opponentManager})`)]
    : [b(ctx.opponentTeam)]
}

type Builder = (ctx: CommentaryContext) => Segment[]

const BUILDERS: Record<string, Builder> = {
  // ---- STUDS ----
  // The value is the gap to the best LEGAL lineup, not the bench's total, so
  // the copy has to say "additional" or it reads as a claim about the bench.
  mastermind: (c) => (Number(c.value) === 0
    ? [
        b(c.managerFirst), t(` started ${pron(c).possessive} optimal lineup outright. `),
        t('Not one additional point was available anywhere on the bench. Surgical.'),
      ]
    : [
        b(c.managerFirst), t(` came closest to ${pron(c).possessive} optimal lineup this week, leaving just `),
        b(`${c.value} additional points`), t(' on the bench. Surgical.'),
      ]),
  // Finding the best free agent on the wire and then leaving him on the bench
  // is a different story from finding him and starting him, and the second
  // half is the funnier one. `Lineup` comes from the award's own supporting
  // stats, so this stays true for whoever does it next.
  waiver_wire_wizard: (c) => (c.extra?.Lineup === 'Benched'
    ? [
        b(c.managerFirst), t(' found '), ...player(c),
        t(' on the wire and he went off for '), b(`${c.value} pts`),
        t(' \u2014 every one of them from the bench. Great eye. Shame about the lineup.'),
      ]
    : [
        b(c.managerFirst), t(' picked up '), ...player(c),
        t(' off the wire and he went off for '), b(`${c.value} pts`), t('. Slay, king!'),
      ]),
  // ⚠️ DO NOT CLAIM ANYTHING ABOUT WHO WANTED A PLAYER. The engine has no ADP
  // and no news, so "nobody else wanted Caleb Williams" was a guess — and a
  // wrong one, in a week half the league was high on the Bears offence. What
  // IS known is the projection, and the gap between it and the result is the
  // whole story anyway.
  nostradamus: (c) => (c.extra?.Projected
    ? [
        t('The projections had '), ...player(c), t(' down for '),
        b(c.extra.Projected), t('. '), b(c.managerFirst), t(' got '),
        b(c.extra.Actual ?? '\u2014'),
        t('. Nobody saw that coming, except the one person who started him.'),
      ]
    : [
        b(c.managerFirst), t(' started '), ...player(c),
        t(' and watched him clear his projection by '), b(c.value),
        t('. Nobody saw that coming, except the one person who started him.'),
      ]),
  cat_burglar: (c) => [
    b(c.managerFirst), t(' won with just '), b(`${c.value} points`),
    t(' — the lowest winning score of the week. Took it from '), ...opponent(c),
    t(' and left no fingerprints.'),
  ],
  giant_killer: (c) => [
    b(c.managerFirst), t(' was projected to lose to '), ...opponent(c), t(' by '),
    b(c.value), t('. Won anyway. Somebody check the tape.'),
  ],
  // The metric carries a sign so the card can colour it. Splicing "+4.3" into
  // a sentence gives "within +4.3 of", so the prose uses the two real numbers
  // instead and lets the direction speak for itself.
  control_group: (c) => (c.extra?.Projected && c.extra?.Scored
    ? [
        b(c.managerFirst), t(' was projected for '), b(c.extra.Projected),
        t(' and scored '), b(c.extra.Scored), t('. No drama, no disasters, '),
        t('nothing to talk about. The scientific method in team form.'),
      ]
    : [
        b(c.managerFirst), t(' finished within '), b(c.value.replace(/^[+\u2212-]/, '')),
        t(` of exactly what ${pron(c).subject} ${pron(c).subject === 'they' ? 'were' : 'was'} projected to score. No drama, no disasters, `),
        t('nothing to talk about. The scientific method in team form.'),
      ]),
  photo_finish: (c) => [
    b(c.managerFirst), t(' beat '), ...opponent(c), t(' by '), b(c.value),
    t('. Any closer and it would have needed a steward\u2019s inquiry.'),
  ],
  // Distribution, not quality. The award cannot tell a good week from a bad
  // one — only a flat one — so the copy must not imply the lineup was strong.
  socialist: (c) => [
    t('Just '), b(`${c.value} points`), t(' separated '), b(c.managerFirst),
    t(`\u2019s best starter from ${pron(c).possessive} worst. Everybody did the same amount of `),
    t('work, for better or for worse. From each according to their ability.'),
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
  // `when` is derived from the snapshot timestamp, never assumed — see
  // slatePhase. Absent for a week captured before continuous snapshots existed.
  sweatin_it_out: (c) => (c.extra?.when
    ? [
        b(c.managerFirst), t(' was down '), b(c.value), t(' to '), ...opponent(c),
        t(` ${c.extra.when} and still walked away with the win. `),
        t('Somewhere a remote control did not survive.'),
      ]
    : [
        b(c.managerFirst), t(' was down '), b(c.value), t(' to '), ...opponent(c),
        t(' and won anyway. Somewhere a remote control did not survive.'),
      ]),
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
    b(`${c.value} points`), t(`. Guess ${pron(c).possessive} team forgot to get off the bus!`),
  ],
  // The gap is the same number either way, but it means something different
  // on the best week in the league than it does on a loss. Scolding the
  // runaway top scorer for leaving points behind is not the joke.
  bench_bum: (c) => {
    if (c.extra?.verdict === 'league-best') {
      return [
        b(c.managerFirst), t(' went scorched earth this week and still had '),
        b(`${c.value} more points`), t(' sitting on the bench. '),
        t('Top score in the league, and it could have been so much worse for everyone else.'),
      ]
    }
    if (c.extra?.verdict === 'won') {
      return [
        b(c.managerFirst), t(' won, and left '), b(`${c.value} points`),
        t(' on the bench doing it. Nobody is checking the receipts on a win.'),
      ]
    }
    return [
      b(c.managerFirst), t('\u2019s optimal lineup was worth '), b(`${c.value} more points`),
      t('. It was sitting on the bench the whole time.'),
    ]
  },
  free_fall: (c) => (c.extra?.['Starting rank'] && c.extra?.['Ending rank']
    ? [
        b(c.managerFirst), t(' slid from '), b(c.extra['Starting rank']),
        t(' to '), b(c.extra['Ending rank']),
        t(' this week. Free fallin\u2019, and not in the fun Tom Petty way.'),
      ]
    : [
        b(c.managerFirst), t(' dropped '), b(`${c.value.replace(/^[\u2212-]/, '')} places`),
        t(' this week. Same league, longer way down.'),
      ]),
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

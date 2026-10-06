/**
 * Award commentary.
 *
 * Every card carries one sentence naming the manager, the player or opponent
 * involved, and the number that earned it — with the details in bold. Player
 * and opponent chips were removed in favor of this, so every card has the same
 * shape regardless of what kind of award it is.
 *
 * ONE builder serves both real and sample awards, so the voice cannot diverge
 * between what you see before week 1 and what you see after it.
 *
 * Voice per SOUL.md: roast the decision, never the person.
 *
 * ## Why every award has five phrasings
 *
 * It used to have one. The Cat Burglar always "left no fingerprints", The
 * Public Execution always "forgot to get off the bus", and twelve people read
 * those same jokes fourteen weeks running with only the names and numbers
 * moving underneath. James: *"It seems like you're using the exact same words,
 * but swapping in new manager/player awards and point totals."*
 *
 * So each builder now hands `pick` a list and gets one back. The template
 * stays — bold name, bold number, one line of commentary — because the
 * template was never the problem.
 *
 * ## The pick has to be deterministic
 *
 * Commentary is built at RENDER time, not stored (see the pronoun note below).
 * `Math.random` would therefore rewrite every card on every page load, and a
 * manager who screenshotted a card on Tuesday would find it saying something
 * else on Thursday. The variant is a pure function of the award key and the
 * week, so a given card reads the same forever and the league still gets a
 * different joke next Tuesday. See `variantIndex`.
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
  /**
   * The week this award belongs to. Chooses the phrasing — see `variantIndex`.
   * Defaults to 0, which is a valid week for the preseason sample cards.
   */
  week?: number
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

/**
 * Verb agreement for a they/them recipient.
 *
 * "they was projected" is the bug these prevent, and it only appears for a
 * manager who is not in the pronoun table — which is exactly the case nobody
 * is looking at when they write a new variant. Prefer a construction that
 * needs none of these; reach for them when the sentence genuinely wants a
 * pronoun as its subject.
 */
const isPlural = (c: CommentaryContext) => pron(c).subject === 'they'
const wasWere = (c: CommentaryContext) => (isPlural(c) ? 'were' : 'was')
const hasHave = (c: CommentaryContext) => (isPlural(c) ? 'have' : 'has')

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

const fnv1a = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * Which phrasing this award shows this week.
 *
 * Week drives it, and it advances by exactly one each week, so an award cycles
 * through every variant it owns before any of them comes back. Five phrasings
 * is therefore five weeks clear, not "probably different" — a random pick
 * would repeat about one week in five, which is the complaint.
 *
 * The key is mixed in so the whole board does not sit on its first variant in
 * week 1 and move in lockstep after that.
 */
export function variantIndex(key: string, week: number, count: number): number {
  if (count <= 1) return 0
  // Both terms are non-negative, so the remainder is too.
  return (Math.abs(Math.trunc(week)) + fnv1a(key)) % count
}

type Pick = (variants: Segment[][]) => Segment[]
type Builder = (c: CommentaryContext, pick: Pick) => Segment[]

/**
 * A builder normally calls `pick` once — each branch offers its own list.
 * Successive calls shift a week, so two lists in one builder do not move in
 * lockstep if somebody ever writes one that way.
 */
function makePick(key: string, week: number): Pick {
  let call = 0
  return (variants) => variants[variantIndex(key, week + call++, variants.length)]
}

const BUILDERS: Record<string, Builder> = {
  // ---- STUDS ----
  // The value is the gap to the best LEGAL lineup, not the bench's total, so
  // the copy has to say "additional" or it reads as a claim about the bench.
  mastermind: (c, pick) => (Number(c.value) === 0
    ? pick([
      [b(c.managerFirst), t(` started ${pron(c).possessive} optimal lineup outright. `),
        t('Not one additional point was available anywhere on the bench. Surgical.')],
      [b(c.managerFirst), t(' set the best lineup that existed. '),
        t('There was no better version of this team to field. Perfect information, perfectly used.')],
      [t('Zero points were reachable from '), b(c.managerFirst),
        t('’s bench that were not already in the lineup. '),
        t('Nothing to second-guess, which must be a strange feeling.')],
      [b(c.managerFirst), t(' submitted a flawless lineup. '),
        t('Every call correct, all of them made before kickoff. Peer review finds nothing.')],
      [t('Not one additional point was reachable from '), b(c.managerFirst),
        t('\u2019s bench. The optimal lineup and the actual lineup were the same object.')],
    ])
    : pick([
      [b(c.managerFirst), t(` came closest to ${pron(c).possessive} optimal lineup this week, leaving just `),
        b(`${c.value} additional points`), t(' on the bench. Surgical.')],
      [b(c.managerFirst), t(' finished within '), b(`${c.value} points`),
        t(' of the best lineup available — the smallest miss in the league. Close enough to call it method.')],
      [t('Only '), b(`${c.value} additional points`), t(' went unclaimed on '),
        b(c.managerFirst), t('’s bench. Nobody in the league wasted less.')],
      [b(c.managerFirst), t(' ran the tidiest lineup of the week, with '),
        b(`${c.value} additional points`), t(' left unaccounted for. Rounding error.')],
      [b(c.managerFirst), t(' misplaced '), b(`${c.value} points`),
        t(` and still set a better lineup than anybody else did. ${isPlural(c) ? 'They were' : `${pron(c).subject[0].toUpperCase()}${pron(c).subject.slice(1)} was`} closest to perfect.`)],
    ])),

  // Finding the best free agent on the wire and then leaving him on the bench
  // is a different story from finding him and starting him, and the second
  // half is the funnier one. `Lineup` comes from the award's own supporting
  // stats, so this stays true for whoever does it next.
  waiver_wire_wizard: (c, pick) => (c.extra?.Lineup === 'Benched'
    ? pick([
      [b(c.managerFirst), t(' found '), ...player(c), t(' on the wire and he went off for '),
        b(`${c.value} pts`), t(' — every one of them from the bench. Great eye. Shame about the lineup.')],
      [b(c.managerFirst), t(' pulled '), ...player(c), t(' off the wire, watched him put up '),
        b(`${c.value} pts`), t(', and watched all of it from the bench. Scouting: excellent. Deployment: catastrophic.')],
      [...player(c), t(' was a free agent until '), b(c.managerFirst), t(' claimed him. He scored '),
        b(`${c.value} pts`), t(' and never left the bench. Found the gold, left it in the pan.')],
      [b(c.managerFirst), t(' was right about '), ...player(c), t(' to the tune of '),
        b(`${c.value} pts`), t(', then benched him. The correct answer, submitted on the wrong form.')],
      [t('The best pickup of the week was '), ...player(c), t(' at '), b(`${c.value} pts`),
        t('. '), b(c.managerFirst), t(' made it and left him on the bench. Diagnosis correct, prescription never filled.')],
    ])
    : pick([
      [b(c.managerFirst), t(' picked up '), ...player(c), t(' off the wire and he went off for '),
        b(`${c.value} pts`), t('. Slay, king!')],
      [b(c.managerFirst), t(' claimed '), ...player(c), t(' and started him for '),
        b(`${c.value} pts`), t('. Finding him is half of it. Trusting him is the half nobody does.')],
      [...player(c), t(' was free, and '), b(c.managerFirst), t(' got '), b(`${c.value} pts`),
        t(' out of him immediately. The wire is not supposed to work this well.')],
      [b(c.managerFirst), t(' took '), ...player(c), t(' off the scrap heap and he returned '),
        b(`${c.value} pts`), t(' in his first week. Somebody was reading the fine print.')],
      [t('The wire was open to all twelve of us. '), b(c.managerFirst), t(' is the one who started '),
        ...player(c), t(' out of it, for '), b(`${c.value} pts`), t('. Free money, collected.')],
    ])),

  // ⚠️ DO NOT CLAIM ANYTHING ABOUT WHO WANTED A PLAYER. The engine has no ADP
  // and no news, so "nobody else wanted Caleb Williams" was a guess — and a
  // wrong one, in a week half the league was high on the Bears offense. What
  // IS known is the projection, and the gap between it and the result is the
  // whole story anyway.
  nostradamus: (c, pick) => (c.extra?.Projected
    ? pick([
      [t('The projections had '), ...player(c), t(' down for '), b(c.extra.Projected), t('. '),
        b(c.managerFirst), t(' got '), b(c.extra.Actual ?? '—'),
        t('. Nobody saw that coming, except the one person who started him.')],
      [...player(c), t(' was projected for '), b(c.extra.Projected), t(' and delivered '),
        b(c.extra.Actual ?? '—'), t(' into '), b(c.managerFirst),
        t('’s lineup. That is not a projection miss, that is a different sport.')],
      [b(c.managerFirst), t(' started '), ...player(c), t(' at '), b(c.extra.Projected),
        t(' projected. He finished on '), b(c.extra.Actual ?? '—'),
        t('. The model has been taken in for questioning.')],
      [t('Everybody saw the same '), b(c.extra.Projected), t(' next to '), ...player(c), t('. '),
        b(c.managerFirst), t(' started him anyway and banked '), b(c.extra.Actual ?? '—'), t('.')],
      [t('Projected '), b(c.extra.Projected), t('. Actual '), b(c.extra.Actual ?? '—'),
        t('. '), ...player(c), t(' made a liar of the forecast, and '), b(c.managerFirst),
        t(' is the one holding the receipt.')],
    ])
    : pick([
      [b(c.managerFirst), t(' started '), ...player(c), t(' and watched him clear his projection by '),
        b(c.value), t('. Nobody saw that coming, except the one person who started him.')],
      [...player(c), t(' beat his own projection by '), b(c.value), t(' in '), b(c.managerFirst),
        t('’s lineup. The forecast was not close.')],
      [b(c.value), t(' more than anybody expected from '), ...player(c), t('. '),
        b(c.managerFirst), t(' had him in the lineup for all of it.')],
      [b(c.managerFirst), t(' got '), b(c.value), t(' of pure surplus out of '), ...player(c),
        t('. The projection is still lying down somewhere.')],
      [t('Largest overshoot in the league: '), ...player(c), t(' by '), b(c.value),
        t(', started by '), b(c.managerFirst), t('. Called it, or got lucky. Either spends the same.')],
    ])),

  cat_burglar: (c, pick) => pick([
    [b(c.managerFirst), t(' won with just '), b(`${c.value} points`),
      t(' — the lowest winning score of the week. Took it from '), ...opponent(c),
      t(' and left no fingerprints.')],
    [b(`${c.value} points`), t(' was all '), b(c.managerFirst), t(' needed to get past '),
      ...opponent(c), t('. The lowest winning score of the week, and it spends exactly the same.')],
    [b(c.managerFirst), t(' beat '), ...opponent(c), t(' with '), b(`${c.value} points`),
      t(' — less than any other winner managed. In and out before the alarm went off.')],
    [t('Nobody won quieter. '), b(c.managerFirst), t(' put up '), b(`${c.value} points`),
      t(', the week’s smallest winning number, and '), ...opponent(c), t(' still lost to it.')],
    [b(c.managerFirst), t(' took the win off '), ...opponent(c), t(' with '),
      b(`${c.value} points`), t('. Every other winner needed more. The standings will not ask.')],
  ]),

  giant_killer: (c, pick) => pick([
    [b(c.managerFirst), t(' was projected to lose to '), ...opponent(c), t(' by '),
      b(c.value), t('. Won anyway. Somebody check the tape.')],
    [t('The projections gave '), ...opponent(c), t(' a '), b(c.value), t(' head start on '),
      b(c.managerFirst), t('. It was not enough. It was not close to enough.')],
    [b(c.managerFirst), t(' walked into a '), b(c.value), t(' projected deficit against '),
      ...opponent(c), t(' and walked out with the win. Hypothesis rejected.')],
    [t('Down '), b(c.value), t(' before a snap was played, '), b(c.managerFirst),
      t(' beat '), ...opponent(c), t(' anyway. The biggest upset on the board.')],
    [b(c.value), t(' was the projected gap. '), b(c.managerFirst),
      t(' closed it, cleared it, and took the result home from '), ...opponent(c), t('.')],
  ]),

  // The metric carries a sign so the card can color it. Splicing "+4.3" into
  // a sentence gives "within +4.3 of", so the prose uses the two real numbers
  // instead and lets the direction speak for itself.
  control_group: (c, pick) => (c.extra?.Projected && c.extra?.Scored
    ? pick([
      [b(c.managerFirst), t(' was projected for '), b(c.extra.Projected), t(' and scored '),
        b(c.extra.Scored), t('. No drama, no disasters, nothing to talk about. '),
        t('The scientific method in team form.')],
      [t('Projected '), b(c.extra.Projected), t('. Scored '), b(c.extra.Scored), t('. '),
        b(c.managerFirst), t(' ran the week exactly as written, which in this league counts as a personality.')],
      [b(c.managerFirst), t(' went '), b(c.extra.Projected), t(' projected, '), b(c.extra.Scored),
        t(' actual. The closest any team came to its own forecast. Reproducible results.')],
      [t('The forecast said '), b(c.extra.Projected), t(' for '), b(c.managerFirst),
        t('. The scoreboard said '), b(c.extra.Scored), t('. Somewhere a statistician is quietly delighted.')],
      [b(c.managerFirst), t(' turned in '), b(c.extra.Scored), t(' against a projection of '),
        b(c.extra.Projected), t('. Eleven other teams surprised somebody. This one did not.')],
    ])
    : pick([
      [b(c.managerFirst), t(' finished within '), b(c.value.replace(/^[+−-]/, '')),
        t(` of exactly what ${pron(c).subject} ${wasWere(c)} projected to score. No drama, no disasters, `),
        t('nothing to talk about. The scientific method in team form.')],
      [b(c.managerFirst), t(' landed '), b(c.value.replace(/^[+−-]/, '')),
        t(' from the projection — closer than any other team. Reproducible results.')],
      [t('Nobody in the league tracked their own forecast better than '), b(c.managerFirst),
        t(', who missed it by '), b(c.value.replace(/^[+−-]/, '')), t('. A week with no surprises in it.')],
      [b(c.value.replace(/^[+−-]/, '')), t(' separated '), b(c.managerFirst),
        t(' from the number the projections handed out before kickoff. Boringly, precisely correct.')],
      [b(c.managerFirst), t(' scored what '), t(`${pron(c).subject} ${wasWere(c)} supposed to, give or take `),
        b(c.value.replace(/^[+−-]/, '')), t('. The control group exists so the rest of this page means something.')],
    ])),

  photo_finish: (c, pick) => pick([
    [b(c.managerFirst), t(' beat '), ...opponent(c), t(' by '), b(c.value),
      t('. Any closer and it would have needed a steward’s inquiry.')],
    [b(c.value), t(' separated '), b(c.managerFirst), t(' from '), ...opponent(c),
      t(' — the narrowest result of the week. A rounding error in the other direction and this card says something else entirely.')],
    [b(c.managerFirst), t(' survived '), ...opponent(c), t(' by '), b(c.value),
      t('. Close enough that one more carry anywhere flips it.')],
    [t('The closest game on the board: '), b(c.managerFirst), t(' over '), ...opponent(c),
      t(' by '), b(c.value), t('. Both managers aged a year.')],
    [b(c.managerFirst), t(' got past '), ...opponent(c), t(' by '), b(c.value), t('. '),
      t('The margin was thinner than the measurement error on most of these numbers.')],
  ]),

  // Distribution, not quality. The award cannot tell a good week from a bad
  // one — only a flat one — so the copy must not imply the lineup was strong.
  socialist: (c, pick) => pick([
    [t('Just '), b(`${c.value} points`), t(' separated '), b(c.managerFirst),
      t(`’s best starter from ${pron(c).possessive} worst. Everybody did the same amount of `),
      t('work, for better or for worse. From each according to their ability.')],
    [b(c.managerFirst), t(' got '), b(`${c.value} points`),
      t(' between the top of the lineup and the bottom of it — the flattest distribution in the league. Nobody stood out in either direction.')],
    [t('From best starter to worst, '), b(c.managerFirst), t(' spanned '), b(`${c.value} points`),
      t('. A lineup with no main character.')],
    [b(c.managerFirst), t('’s starters finished within '), b(`${c.value} points`),
      t(' of each other, top to bottom. Whether that was a good week is a separate question this award does not ask.')],
    [t('Everybody on '), b(c.managerFirst), t('’s roster turned in roughly the same afternoon: '),
      b(`${c.value} points`), t(' between first and last. Collective action.')],
  ]),

  one_man_army: (c, pick) => pick([
    [...player(c), t(' was '), b(c.value), t(' of the score that won it for '),
      b(c.managerFirst), t('. The other nine turned up and watched.')],
    [b(c.managerFirst), t(' won, and '), ...player(c), t(' was '), b(c.value),
      t(' of the reason why. The rest of the lineup was a formality.')],
    [b(c.value), t(' of '), b(c.managerFirst), t('’s winning total came from '), ...player(c),
      t(' alone. One man, one afternoon, one result.')],
    [t('Take '), ...player(c), t(' out of '), b(c.managerFirst),
      t('’s lineup and there is not much left — he carried '), b(c.value),
      t(' of the score in a win.')],
    [b(c.managerFirst), t(' is welcome to the win, but '), ...player(c), t(' did '),
      b(c.value), t(' of the actual labor. Somebody owes somebody a drink.')],
  ]),

  // ⚠️ DO NOT SAY "NOT ONE WEAK LINK IN THE WHOLE LINEUP". This award counts
  // how many starters beat their projection, which was 7 of 10 the week that
  // line shipped — the other three were the weak links it had just denied the
  // existence of. The number is a count, not a clean sweep, and the copy has
  // to leave room for the starters it does not cover.
  slay_girl_slay: (c, pick) => pick([
    [b(c.managerFirst), t(' had '), b(`${c.value} starters`),
      t(' clear their projection — more than anybody else in the league. '),
      t('Whatever is going on over there, it is working.')],
    [b(c.managerFirst), t(' had '), b(`${c.value} starters`),
      t(' beat their own number this week. The lineup did what it was told, which almost never happens.')],
    [t('Nobody had more starters outperform their projection than '), b(c.managerFirst),
      t(', with '), b(c.value), t('. Broad-based gains, no single hero required.')],
    [b(c.managerFirst), t(' got '), b(`${c.value} starters`),
      t(' over the line their own projections drew. A good week that did not depend on one freak result.')],
    [b(`${c.value} starters`), t(' exceeded expectations in '), b(c.managerFirst),
      t('’s lineup, the most in the league. Sometimes the whole experiment just runs clean.')],
  ]),

  // `when` is derived from the snapshot timestamp, never assumed — see
  // slatePhase. Absent for a week captured before continuous snapshots existed.
  sweatin_it_out: (c, pick) => (c.extra?.when
    ? pick([
      [b(c.managerFirst), t(' was down '), b(c.value), t(' to '), ...opponent(c),
        t(` ${c.extra.when} and still walked away with the win. `),
        t('Somewhere a remote control did not survive.')],
      [t('Trailing '), ...opponent(c), t(' by '), b(c.value), t(` ${c.extra.when}, `),
        b(c.managerFirst), t(' came all the way back. The biggest hole anybody climbed out of this week.')],
      [b(c.value), t(' down to '), ...opponent(c), t(` ${c.extra.when}. `), b(c.managerFirst),
        t(' won anyway, which is a lot of heart rate for one afternoon.')],
      [b(c.managerFirst), t(' spent '), t(`${c.extra.when} `), b(c.value), t(' behind '),
        ...opponent(c), t(' and finished in front. Nobody enjoyed that less than the person who did it.')],
      [t('The deficit was '), b(c.value), t(` ${c.extra.when}. `), b(c.managerFirst),
        t(' erased all of it and beat '), ...opponent(c), t('. Recovery complete, nerves not.')],
    ])
    : pick([
      [b(c.managerFirst), t(' was down '), b(c.value), t(' to '), ...opponent(c),
        t(' and won anyway. Somewhere a remote control did not survive.')],
      [b(c.managerFirst), t(' faced a '), b(c.value), t(' deficit against '), ...opponent(c),
        t(' and erased every point of it. The largest comeback of the week.')],
      [t('Down '), b(c.value), t(' at the low point, '), b(c.managerFirst), t(' still beat '),
        ...opponent(c), t('. The scoreboard forgets. The nervous system does not.')],
      [b(c.value), t(' is how far behind '), b(c.managerFirst), t(' got against '),
        ...opponent(c), t(' before turning it around. Nobody came back from further.')],
      [b(c.managerFirst), t(' trailed '), ...opponent(c), t(' by '), b(c.value),
        t(' and won it back. A result, and separately, an ordeal.')],
    ])),

  prime_specimen: (c, pick) => pick([
    [b(c.managerFirst), t(' started '), ...player(c), t(' and watched him drop '),
      b(`${c.value} pts`), t(' — the best performance in the league this week.')],
    [...player(c), t(' put up '), b(`${c.value} pts`),
      t(', the highest score by any started player this week. '), b(c.managerFirst), t(' had him.')],
    [t('Nobody in the league got more out of one roster spot: '), ...player(c), t(' for '),
      b(`${c.value} pts`), t(' in '), b(c.managerFirst), t('’s lineup.')],
    [b(c.managerFirst), t(' had the best player on the board. '), ...player(c), t(' went for '),
      b(`${c.value} pts`), t(' and nobody came close.')],
    [b(`${c.value} pts`), t(' from '), ...player(c), t('. The top started score of the week, and '),
      b(c.managerFirst), t(' is the one who wrote him into the lineup.')],
  ]),

  // ---- DUDS ----
  dumpster_fire: (c, pick) => pick([
    [b(c.managerFirst), t(' managed '), b(`${c.value} points`),
      t('. Nobody in the entire league did worse. Somebody get the extinguisher.')],
    [b(`${c.value} points`), t('. That is the whole week for '), b(c.managerFirst),
      t(', and the lowest number anybody posted. The experiment did not survive contact with Sunday.')],
    [t('Twelve teams played. '), b(c.managerFirst), t(' scored '), b(`${c.value} points`),
      t(', which was the least of them. Nothing in the lineup worked at the same time.')],
    [b(c.managerFirst), t(' put '), b(`${c.value} points`),
      t(' on the board — league low, by some distance. A week to file and never reopen.')],
    [t('The lowest score in the league belongs to '), b(c.managerFirst), t(' at '),
      b(`${c.value} points`), t('. Somewhere in there was a lineup decision. It did not help.')],
  ]),

  choke_artist: (c, pick) => pick([
    [b(c.managerFirst), t(' was projected to beat '), ...opponent(c), t(' by '),
      b(c.value), t('. Lost. Not a single thing went to plan.')],
    [t('The projections had '), b(c.managerFirst), t(' over '), ...opponent(c), t(' by '),
      b(c.value), t('. The projections were having a day.')],
    [b(c.managerFirst), t(' went in '), b(c.value), t(' ahead on paper and came out behind '),
      ...opponent(c), t(' in fact. The largest favorite to lose this week.')],
    [b(c.value), t(' of projected cushion, gone. '), b(c.managerFirst), t(' lost to '),
      ...opponent(c), t(' with the biggest edge anybody wasted.')],
    [t('Favored by '), b(c.value), t(' against '), ...opponent(c), t(', '), b(c.managerFirst),
      t(' lost anyway. The pregame number is not a result, as it turns out.')],
  ]),

  bad_beat: (c, pick) => pick([
    [b(c.managerFirst), t(' scored '), b(c.value), t(' and still lost to '), ...opponent(c),
      t('. That total would have beaten every other team this week.')],
    [b(c.value), t(' was the highest score by anybody who lost. '), b(c.managerFirst),
      t(' ran into '), ...opponent(c), t(' and the schedule did the rest.')],
    [t('Nothing went wrong for '), b(c.managerFirst), t(', who put up '), b(c.value),
      t(' and lost to '), ...opponent(c), t(' regardless. Right week, wrong opponent.')],
    [b(c.managerFirst), t(' turned in '), b(c.value), t(' — a winning score in any other matchup. '),
      ...opponent(c), t(' was not any other matchup.')],
    [t('There is no lineup lesson here. '), b(c.managerFirst), t(' scored '), b(c.value),
      t(', the best total among the week’s losers, and met '), ...opponent(c), t(' anyway.')],
  ]),

  public_execution: (c, pick) => pick([
    [b(c.managerFirst), t(' lost to '), ...opponent(c), t(' by '),
      b(`${c.value} points`), t(`. Guess ${pron(c).possessive} team forgot to get off the bus!`)],
    [...opponent(c), t(' beat '), b(c.managerFirst), t(' by '), b(`${c.value} points`),
      t('. The widest margin of the week, and it was never in doubt.')],
    [b(`${c.value} points`), t(' separated '), b(c.managerFirst), t(' from '), ...opponent(c),
      t(' at the final whistle. At some stage you stop checking the scores.')],
    [b(c.managerFirst), t(' lost by '), b(`${c.value} points`), t(' to '), ...opponent(c),
      t('. A margin that large stops being a matchup and becomes a scheduling note.')],
    [t('Worst beating of the week: '), ...opponent(c), t(' over '), b(c.managerFirst),
      t(' by '), b(`${c.value} points`), t('. There was no point in the afternoon where it looked close.')],
  ]),

  // The gap is the same number either way, but it means something different
  // on the best week in the league than it does on a loss. Scolding the
  // runaway top scorer for leaving points behind is not the joke.
  bench_bum: (c, pick) => {
    if (c.extra?.verdict === 'league-best') {
      return pick([
        [b(c.managerFirst), t(' went scorched earth this week and still had '),
          b(`${c.value} more points`), t(' sitting on the bench. '),
          t('Top score in the league, and it could have been so much worse for everyone else.')],
        [t('Top score in the league, and '), b(c.managerFirst), t(' still left '),
          b(`${c.value} points`), t(' unused. The rest of you should be grateful for the restraint.')],
        [b(c.managerFirst), t(' won the week outright with '), b(`${c.value} points`),
          t(' still on the bench. That is not a mistake, that is a warning.')],
        [t('The league’s best score came with '), b(`${c.value} points`), t(' spare on '),
          b(c.managerFirst), t('’s bench. Nobody is filing a complaint about this one.')],
        [b(`${c.value} points`), t(' went unused and '), b(c.managerFirst),
          t(' still outscored everybody. The margin for error was enormous and never needed.')],
      ])
    }
    if (c.extra?.verdict === 'won') {
      return pick([
        [b(c.managerFirst), t(' won, and left '), b(`${c.value} points`),
          t(' on the bench doing it. Nobody is checking the receipts on a win.')],
        [b(`${c.value} points`), t(' stayed on '), b(c.managerFirst),
          t('’s bench. The win column does not have a notes field.')],
        [b(c.managerFirst), t(' got away with it: '), b(`${c.value} points`),
          t(' unplayed, and the W landed anyway.')],
        [t('A win is a win, even with '), b(`${c.value} points`), t(' parked on '),
          b(c.managerFirst), t('’s bench. File it and say nothing.')],
        [b(c.managerFirst), t(' left '), b(`${c.value} points`),
          t(' in reserve and did not need a single one of them. Lucky, or very confident.')],
      ])
    }
    return pick([
      [b(c.managerFirst), t('’s optimal lineup was worth '), b(`${c.value} more points`),
        t('. It was sitting on the bench the whole time.')],
      [b(`${c.value} points`), t(' were available to '), b(c.managerFirst),
        t(' from players already on the roster. None of them were in the lineup.')],
      [b(c.managerFirst), t(' left '), b(`${c.value} points`),
        t(' on the bench — the biggest gap in the league between what was started and what could have been.')],
      [t('The team '), b(c.managerFirst), t(' could have started was '), b(`${c.value} points`),
        t(' better than the one '), t(`${pron(c).subject} did. Everybody ${hasHave(c)} a version of this week.`)],
      [b(`${c.value} points`), t(' of '), b(c.managerFirst),
        t('’s roster never took the field. The talent was there. The lineup card was not.')],
    ])
  },

  free_fall: (c, pick) => (c.extra?.['Starting rank'] && c.extra?.['Ending rank']
    ? pick([
      [b(c.managerFirst), t(' slid from '), b(c.extra['Starting rank']), t(' to '),
        b(c.extra['Ending rank']),
        t(' this week. Free fallin’, and not in the fun Tom Petty way.')],
      [t('A week ago '), b(c.managerFirst), t(' was '), b(c.extra['Starting rank']),
        t('. Now it reads '), b(c.extra['Ending rank']), t('. The table moves fast when you stop holding on.')],
      [b(c.extra['Starting rank']), t(' to '), b(c.extra['Ending rank']), t(' in seven days. '),
        b(c.managerFirst), t(' found the one direction nobody is aiming for.')],
      [b(c.managerFirst), t(' went from '), b(c.extra['Starting rank']), t(' to '),
        b(c.extra['Ending rank']), t(', the biggest drop on the board. Same league, longer way down.')],
      [t('The standings put '), b(c.managerFirst), t(' at '), b(c.extra['Ending rank']),
        t(', down from '), b(c.extra['Starting rank']), t('. Gravity remains undefeated.')],
    ])
    : pick([
      [b(c.managerFirst), t(' dropped '), b(`${c.value.replace(/^[−-]/, '')} places`),
        t(' this week. Same league, longer way down.')],
      [b(`${c.value.replace(/^[−-]/, '')} places`), t(' lost in one week by '),
        b(c.managerFirst), t('. Nobody fell further.')],
      [b(c.managerFirst), t(' is '), b(`${c.value.replace(/^[−-]/, '')} places`),
        t(' worse off than last Tuesday. The table is not sentimental.')],
      [t('Down '), b(`${c.value.replace(/^[−-]/, '')} places`), t(' goes '), b(c.managerFirst),
        t('. Free fallin’, and not in the fun Tom Petty way.')],
      [b(c.managerFirst), t(' shed '), b(`${c.value.replace(/^[−-]/, '')} places`),
        t(' in a single week. It takes a month to climb that and an afternoon to lose it.')],
    ])),

  understudy: (c, pick) => pick([
    [...player(c), t(' put up '), b(`${c.value} pts`), t(' for '), b(c.managerFirst),
      t(' and did it in street clothes. Best seat in the house.')],
    [b(c.managerFirst), t(' had '), ...player(c), t(' and '), b(`${c.value} pts`),
      t(' of him, all from the bench. The best score nobody started this week.')],
    [t('The highest-scoring benched player in the league was '), ...player(c), t(' at '),
      b(`${c.value} pts`), t('. He belongs to '), b(c.managerFirst), t('. He played for nobody.')],
    [...player(c), t(' scored '), b(`${c.value} pts`), t(' and '), b(c.managerFirst),
      t(' got to keep none of them. Rostered, watched, wasted.')],
    [b(`${c.value} pts`), t(' sat out the week on '), b(c.managerFirst), t('’s bench in the form of '),
      ...player(c), t('. He was available the entire time.')],
  ]),

  galaxy_brain: (c, pick) => pick([
    [b(c.managerFirst), t(' made '), b(`${c.value} roster moves`),
      t(' this week and still lost to '), ...opponent(c), t('. Sometimes the big brain is the problem.')],
    [b(`${c.value} roster moves`), t(' later, '), b(c.managerFirst), t(' lost to '),
      ...opponent(c), t(' anyway. More inputs, same output.')],
    [t('Nobody worked harder at it than '), b(c.managerFirst), t(' — '), b(`${c.value} moves`),
      t(', one loss to '), ...opponent(c), t('. Effort is not a strategy.')],
    [b(c.managerFirst), t(' tinkered '), b(`${c.value} times`), t(' and '), ...opponent(c),
      t(' won regardless. At some point the roster wants to be left alone.')],
    [b(`${c.value} moves`), t(' in one week from '), b(c.managerFirst),
      t(', and the result was a loss to '), ...opponent(c), t('. The most managed defeat of the week.')],
  ]),
}

export function buildCommentary(key: string, ctx: CommentaryContext): Segment[] {
  const builder = BUILDERS[key]
  if (!builder) return [b(ctx.managerFirst), t(` — ${ctx.value}.`)]
  return builder(ctx, makePick(key, ctx.week ?? 0))
}

/** Every award key that has commentary, for the tests that police the set. */
export const COMMENTARY_KEYS = Object.keys(BUILDERS)

/**
 * Every phrasing a key can produce across `weeks` weeks, for testing.
 *
 * Exported so a test can assert that an award actually reads differently from
 * one week to the next, rather than asserting on the shape of the variant list.
 */
export function commentaryVariants(
  key: string, ctx: CommentaryContext, weeks: number,
): string[] {
  return Array.from({ length: weeks }, (_, i) =>
    buildCommentary(key, { ...ctx, week: i + 1 }).map((s) => s.text).join(''))
}

/** Managers are referred to by first name throughout. */
export const firstName = (full: string | null | undefined) =>
  (full ?? '').trim().split(/\s+/)[0] || 'Somebody'

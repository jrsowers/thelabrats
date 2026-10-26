/**
 * How Burner declines to discuss an injury.
 *
 * The roast boundary says injuries are reported flat and never made funny.
 * That rule is correct and it is not changing. What went wrong is that the
 * SENTENCE enforcing it became a tic: five posts across six weeks, and two of
 * them word for word identical —
 *
 *   "That is the full medical report and I'm not adding to it."
 *
 * James, 2026-10-26: *"It's tired and overused... you could rotate in some
 * funnier quips."*
 *
 * ## The trick
 *
 * The joke lands on **Burner's own lack of standing**, never on the injury or
 * the player. He is a man with a laboratory, a microphone and no credentials
 * whatsoever, and the funny part is him solemnly recusing himself. That keeps
 * the player untouched — which is the whole point of the disclaimer — while
 * stopping the line from reading like a compliance notice.
 *
 * So the shape is always:
 *
 *   [the fact, stated flat] + [Burner has no business commenting]
 *
 * NOT a joke about the injury, the body, the timetable, or the player's
 * absence. Those remain off the table exactly as before.
 *
 * ## Using these
 *
 * One per post, and never the same one twice in a season.
 * `tests/medical-disclaimers.test.ts` fails the build on a repeat, because an
 * instruction not to repeat yourself is precisely the kind of instruction that
 * does not hold — this is the fifth time that lesson has come up.
 *
 * Writing a new one is encouraged. Add it here so the test can see it.
 */

/**
 * Each line carries a `fingerprint`: the short distinctive phrase that
 * identifies it even after a writer bends the sentence to fit a paragraph.
 *
 * ⚠️ THE FINGERPRINT IS THE WHOLE CONTROL. Matching on the full sentence does
 * not work, because nobody drops a canned line in verbatim — the five uses
 * already published were each reworded at the join ("...a medical degree, so
 * that is where I stop"), and a substring check found two of them. A reuse
 * test that cannot see a reworded reuse is decoration.
 */
export interface MedicalDisclaimer {
  id: string
  line: string
  /** Must stay distinctive enough that no two lines could both match. */
  fingerprint: RegExp
}

export const MEDICAL_DISCLAIMERS: MedicalDisclaimer[] = [
  {
    id: 'holiday-inn',
    line: 'I stayed at a Holiday Inn Express last night and I am still not qualified to comment on this.',
    fingerprint: /holiday inn express/i,
  },
  {
    id: 'licensing-board',
    line: 'My doctorate is in Applied Gridiron Sciences, which the licensing board has been extremely clear is not the same thing.',
    fingerprint: /licensing board/i,
  },
  {
    id: 'nicaragua',
    line: 'Owing to an unresolved matter involving a clinic in Nicaragua, I am not at liberty to share an opinion here.',
    fingerprint: /clinic in nicaragua/i,
  },
  {
    id: 'lab-coat',
    line: 'I have a lab coat and a microphone. Neither one of those is a medical degree.',
    fingerprint: /lab coat and a microphone/i,
  },
  {
    id: 'settlement',
    line: 'The last time I offered a medical opinion there was a settlement, so that is where the reporting ends.',
    fingerprint: /there was a settlement/i,
  },
  {
    id: 'cruise-ship',
    line: 'I am a doctor in roughly the way a cruise ship is a boat, so we will stop there.',
    fingerprint: /cruise ship is a boat/i,
  },
  {
    id: 'practicing',
    line: 'Beyond that I would be practicing medicine, and I have been asked repeatedly not to.',
    fingerprint: /practicing medicine/i,
  },
  {
    id: 'first-aid',
    line: 'My training in this area consists of a first-aid course I did not finish and a great deal of confidence.',
    fingerprint: /first-aid course/i,
  },
  {
    id: 'injunction',
    line: 'There is an injunction that prevents me from going further and, for once, I think it is working.',
    fingerprint: /injunction/i,
  },
  {
    id: 'check-up',
    line: 'I will give that the same rigorous analysis I give my own annual check-up, which is none at all.',
    fingerprint: /annual check-up/i,
  },
  {
    id: 'state-authorities',
    line: 'Several state authorities would prefer I left that one alone, and this week I am inclined to agree with them.',
    fingerprint: /state authorities/i,
  },
  {
    id: 'insurer',
    line: 'I am qualified to observe this and nothing else, a distinction my insurer has underlined twice.',
    fingerprint: /my insurer/i,
  },
]

/**
 * The retired phrasing. Kept so the test can fail on it by name rather than
 * just failing on "you repeated yourself" — a writer reaching for this exact
 * construction should be told why it is gone.
 */
export const RETIRED_DISCLAIMER_PATTERNS: RegExp[] = [
  /that (is|’s) the (full|entire) medical report/i,
  /not (going to add|adding) to it/i,
  /it (is|’s) not funny,? and I am not going to make it funny/i,
  /there(’s| is) nothing funny anywhere in it/i,
]

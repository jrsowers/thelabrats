/**
 * Things that happened which no query can find.
 *
 * The pipeline is good at numbers. It reads every score, every projection,
 * every roster move, and the recap is built on all of it. What it cannot see
 * is the *reason* a number is what it is — a quarterback taking a knee at the
 * one-yard line instead of scoring, a coach resting a starter at half time, a
 * receiver playing through something nobody announced.
 *
 * Those details are frequently the whole story, and they are invisible to both
 * a database query and a news search, because a box score records that a
 * touchdown was not scored and says nothing about the decision not to score it.
 *
 * James, 2026-09-28, supplying the first one: *"Not sure if it will show up in
 * your news query."* It did not. It would not have.
 *
 * So this file is where a human observation goes to survive until somebody is
 * writing. Both `gather.ts` scripts print the notes for the week they are
 * gathering, so the writer cannot miss one.
 *
 * ## Rules
 *
 * - **Every note gets verified before it is used.** These are recollections,
 *   and recollections are wrong sometimes. The `verified` field records that
 *   somebody actually checked, and against what. An unverified note is a lead,
 *   not a fact.
 * - **A note is context, never a number.** Scores and stat lines still come
 *   from the database and from searches. A note explains a number; it does not
 *   replace one.
 * - **The roast boundary still applies.** A note about somebody's injury,
 *   health or private life is not material, however true it is.
 * - **The source never appears in the copy.** `source` is provenance for the
 *   writer. Week 4 printed "James tells me he was trailing by less than half a
 *   point", which reads as a manager briefing his own coverage. State the fact
 *   as an observation, in Burner's voice, or do not state it.
 */
export interface LeagueNote {
  year: number
  week: number
  /** Who noticed it. */
  source: string
  /** The observation, in enough detail to write from. */
  note: string
  /**
   * How it was confirmed, and by whom. Null means NOBODY HAS CHECKED YET —
   * treat it as a lead to research, not as something to print.
   */
  verified: string | null
  /** Managers and players it touches, so a writer scanning can spot relevance. */
  touches: string[]
}

export const LEAGUE_NOTES: LeagueNote[] = [
  {
    year: 2026,
    week: 3,
    source: 'James',
    note:
      'Trevor Lawrence took a knee at the 1-yard line rather than score, with '
      + 'Jacksonville up 28-6 and over eight minutes left in the fourth. New '
      + 'England called a timeout, and Bhayshul Tuten scored on the very next '
      + 'play. Lawrence afterwards: "In hindsight, I probably should’ve just '
      + 'scored because we scored the very next play," and he joked he was '
      + 'trying to support the Bhayshul Tuten fantasy people. Jaguars won 35-6.'
      + '\n\nIn this league that is a direct transfer: James started Lawrence, '
      + 'Tyler started Tuten in the flex. A rushing touchdown is worth roughly '
      + 'six points, and James is leading his week 3 matchup by 5.0.',
    verified:
      'CBS Sports and Yahoo Sports, searched 2026-09-28. Game was Jaguars 35, '
      + 'Patriots 6 on 2026-09-27.',
    touches: ['James', 'Tyler', 'Trevor Lawrence', 'Bhayshul Tuten'],
  },
]

/** Notes for one week, newest source first. Empty is the normal case. */
export const notesForWeek = (year: number, week: number): LeagueNote[] =>
  LEAGUE_NOTES.filter((n) => n.year === year && n.week === week)

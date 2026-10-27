/**
 * Weekly recaps — a deliberately small, file-based CMS.
 *
 * There will be at most 14 of these in a season. A hosted CMS would add an
 * account, an API, a build hook and a failure mode, to manage fourteen
 * documents that live happily in version control beside the code that renders
 * them.
 *
 * To publish: add an entry, set `published: true`, commit. The archive and the
 * individual pages both read from here.
 *
 * Written by the `fantasy-weekly-recap` skill, which carries the voice spec, the
 * research process and the roast boundary. Every number in a recap comes from
 * the awards engine or a searched source — nothing here is computed by an LLM.
 */
import { BURNER, type Author } from './author'

export type RecapBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'stat'; label: string; value: string; note?: string }
  | { type: 'quote'; text: string; attribution?: string }
  /**
   * A week's matchups. A real block rather than prose, because six scores
   * written as sentences is a wall of numbers nobody parses — week 1 shipped
   * them that way and they were unreadable. Higher score first in each row.
   *
   * `live` marks a week still being PLAYED: the rows are leading and trailing,
   * not winner and loser, and the block labels itself accordingly.
   */
  | { type: 'scoreboard'; rows: ScoreboardRow[]; live?: boolean }

/**
 * A call Burner made on the record.
 *
 * Structured rather than left in the prose so the next recap can be *made* to
 * account for it. He is supposed to be confidently wrong in public and own it
 * the following week, and that only works if the bill actually arrives —
 * `scripts/recall.ts` prints every open prediction before a recap is written,
 * and the skill requires each one to be resolved or explicitly carried.
 */
export interface RecapPrediction {
  /** Stable handle. Referenced by the week that settles it. */
  id: string
  /** The claim, in one line. */
  claim: string
  /**
   * Left unset while the prediction is still live.
   *
   * `void` means it was never a prediction: the outcome was already forced
   * when it was written, by a bye, an elimination or a rule. It is settled
   * without being scored, because collecting on a certainty is worse than
   * being wrong — being wrong is the bit, and this is just taking credit.
   */
  verdict?: 'correct' | 'wrong' | 'partial' | 'void'
  /** Week the verdict was rendered. */
  resolvedWeek?: number
  /** The line he actually used to settle it, so it is never re-litigated. */
  resolution?: string
}

export interface ScoreboardRow {
  /**
   * The higher score. Named `top`/`bottom` rather than `winner`/`loser`
   * because on a Monday board nobody has won anything yet, and a type that
   * lies is a bug waiting for somebody to trust it.
   */
  top: string
  topScore: number
  bottom: string
  bottomScore: number
  /** Shown after the margin. On a live board: what is still to come. */
  note?: string
}

/**
 * Which series a post belongs to.
 *
 * `recap` runs on Tuesday and looks BACKWARD at a settled week. `miracles`
 * runs on Monday morning and looks FORWARD at a week still in flight, when
 * three matchups are undecided and the only thing left is one football game.
 * They share a byline, a cover treatment and a publishing pipeline; they do
 * not share a tense, and almost every mistake available here is a tense
 * mistake — a Monday post that says "won" instead of "leads" is wrong by
 * Tuesday and cannot be unpublished from anybody's memory.
 */
export type Series = 'recap' | 'miracles'

export const SERIES_LABEL: Record<Series, string> = {
  recap: 'Weekly Recap',
  miracles: 'Monday Night Miracles',
}

export interface Recap {
  /** URL segment: /recaps/<slug> */
  slug: string
  /** Defaults to 'recap' for everything written before the series split. */
  series?: Series
  week: number
  /** Headline. Written like a broadcast, not a report (SOUL.md). */
  title: string
  /** One or two sentences for the archive card. */
  summary: string
  publishedAt: string
  /** Set false to keep a draft out of the archive. */
  published: boolean
  /**
   * Featured image under /public. Optional on purpose: without one the cover
   * falls back to a generated treatment, so a missing image never holds up a
   * recap that is otherwise finished.
   */
  coverImage?: string
  coverAlt?: string
  /**
   * Optional so the type does not lie, but in practice every recap is bylined —
   * the archive shows the byline on every card, and one card without a face in
   * a row of faces reads as a bug rather than a distinction.
   */
  author?: Author
  /** Calls made on the record this week. See RecapPrediction. */
  predictions?: RecapPrediction[]
  body: RecapBlock[]
}

export const RECAPS: Recap[] = [
  {
    slug: 'week-7-it-took-twelve-days',
    week: 7,
    title: 'I Said Bring It Back To Me In January. It Took Twelve Days.',
    summary:
      'Evan scored 198.7, the highest total in the history of this league, and killed a prediction I made two weeks ago with a flourish I did not appreciate. James started a defense that scored minus three. Justin won with the lowest winning score ever recorded. And Jay is back on top of the table a week ahead of schedule.',
    publishedAt: '2026-10-27',
    published: true,
    coverImage: '/recaps/week-7.jpg',
    coverAlt:
      'A football player silhouetted in mid-air, fully extended and rim-lit in gold against the blown-out glare of stadium floodlights.',
    author: BURNER,
    predictions: [
      {
        id: 'evan-makes-playoffs',
        claim: 'Evan makes the playoffs from 3-4.',
      },
      {
        id: 'mike-top-four',
        claim: 'Mike finishes in the top four with the fewest points of any team in it.',
      },
      {
        id: 'doug-last-not-in-points',
        claim: 'Doug finishes last in this league and does not finish last in points scored.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Two weeks ago I told you that Keshia’s 191.3 would stand as the highest score anybody posts this season. I remember being pleased with the line. I signed off by inviting you to write it down and bring it back to me in January.',
      },
      {
        type: 'paragraph',
        text: 'It took twelve days.',
      },
      {
        type: 'paragraph',
        text: 'Evan scored 198.7 on Sunday. That’s the highest total any team has ever posted in this league, it beat the old record by 1.2, and it was done by a man who came into the week 2-4 and has spent this entire season being the punchline of a joke about bad luck.',
      },
      {
        type: 'paragraph',
        text: 'I’d like to move on quickly, but we can’t, because the way he did it is worse.',
      },
      { type: 'heading', text: 'BENGALS 35, RAVENS 13 — Cincinnati Scored Thirty-Five Unanswered And Four Of You Were In The Building' },
      {
        type: 'paragraph',
        text: 'Baltimore led 13-0 at halftime. Cincinnati then outscored them 35-0 the rest of the way, which is less a comeback than a change of management. Joe Burrow went 22 of 30 for 292 yards and four touchdowns, and sixteen of those completions came after the break.',
      },
      {
        type: 'paragraph',
        text: 'Burrow is Evan’s quarterback, on a team called Burrow My Burden, and he delivered 36.88 and the quarterback crown. I’ve been waiting six weeks for that sentence to be available to me and I want you all to know I enjoyed it.',
      },
      {
        type: 'paragraph',
        text: 'The other side of that game was a demolition of Chenell’s afternoon. Derrick Henry was held to 5.4 against a 17.4 projection. Tyler Huntley — the man Chenell plucked off the wire in week 5 and rode to a league record — was sacked four times and gave her 18.12. Her entire Baltimore operation went down in one evening and she won anyway, which we’ll get to.',
      },
      {
        type: 'paragraph',
        text: 'Tee Higgins went for 148 yards and a score, worth 23.8 to Jay. Ja’Marr Chase added a touchdown and 14.7 for James. Four managers in one football game, and the two who had Bengals are first and eighth.',
      },
      { type: 'heading', text: 'DOLPHINS 28, JETS 25 — The Argument On The Sideline Was About Keshia’s Week' },
      {
        type: 'paragraph',
        text: 'Miami won its first game of the season at MetLife, and New York’s comeback stalled three points short. Geno Smith went 23 of 30 for 287 yards and three touchdowns, hit Taylor from thirteen out with 3:24 left, and converted the two-point try to make it 28-25. That’s 30.48 for Evan, who had a quarterback going off in both of the games I’ve described so far.',
      },
      {
        type: 'paragraph',
        text: 'On the other sideline, Malik Willis put up 30.02 for Jay in Miami’s first win of the year. Two quarterbacks, thirty points each, one game, and both of the managers holding them won comfortably.',
      },
      {
        type: 'paragraph',
        text: 'Here’s the part I can’t let go of. Geno Smith threw for 287 yards and three scores, and Garrett Wilson — Keshia’s starting receiver — finished with 3.6 against a 12.3 projection. During the game the two of them were seen having a heated exchange on the sideline, which both men downplayed afterward.',
      },
      {
        type: 'paragraph',
        text: 'I don’t know what was said. I do know that somewhere in New Jersey on Sunday, two professional athletes had a public disagreement about the exact thing that cost Keshia her week, and she lost by 5.7. Nobody has ever been so well represented and so poorly served at the same time.',
      },
      { type: 'heading', text: 'BUCCANEERS 43, PANTHERS 13 — James Started This Defense' },
      {
        type: 'paragraph',
        text: 'Tampa Bay rushed for 258 yards, took five sacks off Carolina, picked them off twice and scored twenty points off turnovers. They led 33-6 at the half. Carolina’s solitary bright spot was a 50-yard touchdown to Darren Waller, and even that went wrong — the extra point was blocked and returned the other way for two.',
      },
      {
        type: 'paragraph',
        text: 'James started the Carolina defense. It scored minus three.',
      },
      {
        type: 'paragraph',
        text: 'That is the worst performance by any started player in the history of this league. Not the lowest. Negative. He submitted a lineup containing a roster spot that actively charged him for the privilege, and he did it seven days after turning in a mathematically perfect lineup and taking four awards off it.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'The organized paragraph, as required. Both ends of this board are historical: the top row is the highest score anybody has ever posted here and the bottom row is the lowest winning score anybody has ever posted here, and they happened on the same afternoon.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Burrow My Burden', topScore: 198.7, bottom: 'Nobody Knows', bottomScore: 127.2, note: 'highest score in league history' },
          { top: 'Dad Bod', topScore: 159.9, bottom: 'Tyler’s Talented Team', bottomScore: 123.4 },
          { top: 'PKM Playmakers', topScore: 138.6, bottom: 'Mr. Anderson', bottomScore: 99.4 },
          { top: 'Nix Pix a Puka Six', topScore: 124.2, bottom: 'Soft Tissue Issues', bottomScore: 93.9 },
          { top: 'Da Reigning Champ', topScore: 112.6, bottom: 'Bree’s Badass Boys', bottomScore: 105.8 },
          { top: 'Substation Superstars', topScore: 107.9, bottom: 'All Bark, All Bite', bottomScore: 102.3, note: 'lowest winning score ever recorded' },
        ],
      },
      { type: 'heading', text: 'Evan Had Six Men Over Twenty And Still Has A Losing Record' },
      {
        type: 'paragraph',
        text: 'Burrow 36.88. Tony Pollard 35.0 against a 12.94 projection, which is the largest overshoot of the week and Fantasy Nostradamus. Geno Smith 30.48. Jaxon Smith-Njigba 26.8. Quinshon Judkins 22.9. Luther Burden III 21.7.',
      },
      {
        type: 'paragraph',
        text: 'Six players over twenty points, seven starters beating their projection, and three of the six position crowns. He took The Prime Specimen, Fantasy Nostradamus and Slay Girl Slay, and he buried Doug by 71.5.',
      },
      {
        type: 'paragraph',
        text: 'And he’s 3-4. Eighth. The man who owns the single highest score in the history of this experiment has a losing record and sits outside the playoff line, which in six weeks of writing this column is the most elegant thing the schedule has ever done to anybody.',
      },
      {
        type: 'paragraph',
        text: 'Spare a thought for Doug, who scored 127.2 — a respectable total in most weeks of most seasons — and lost by 71.5 for it. He took The Bad Beat and The Public Execution out of the same game, which is a bleak sort of doubling up. He’s 1-6. I’ve run out of ways to describe this and I’m not sure he wants me to find more.',
      },
      { type: 'heading', text: 'James Went From A Perfect Lineup To The Dumpster Fire In Seven Days' },
      {
        type: 'paragraph',
        text: 'Last week I wrote the sentence “James took four awards and did not leave a single point behind.” This week he scored 93.9, the lowest total in the league, and took The Dumpster Fire. He also made eleven roster moves and lost by 30.3, which is The Galaxy Brain.',
      },
      {
        type: 'paragraph',
        text: 'Some of it wasn’t his fault. Jacksonville was on bye, so Trevor Lawrence — 36.34 for him in week 6 — sat there at zero and James had to go to Cam Ward, who gave him 6.74, and Patrick Mahomes, who gave him 7.0 against a 18.95 projection.',
      },
      {
        type: 'paragraph',
        text: 'The defense was his fault. Eleven moves in a week is a man refreshing a page, and one of those moves put a Carolina defense into his starting lineup against a team that would hang 43 on them. You can’t legislate for Mahomes. You can absolutely legislate for that.',
      },
      { type: 'heading', text: 'Jay Is Back On Top And I Called It A Week Early' },
      {
        type: 'paragraph',
        text: 'Two weeks ago I objected to Jay being in first. He then had the worst week of anybody’s season and fell to fourth, and I predicted he’d be back in the top two by the end of week 8.',
      },
      {
        type: 'paragraph',
        text: 'He’s first, with a week in hand. He beat Tyler 159.9 to 123.4 on the back of 30.02 from Malik Willis and 23.8 from Tee Higgins, and he’s 5-2 with the second-most points in the league. I’d like this noted in the same ledger as everything else, where it will be heavily outnumbered.',
      },
      {
        type: 'paragraph',
        text: 'Tyler, meanwhile, fell four places from first to fifth and collected Free Fallin’ for it. He’s now scored 1,026.3 points this season. He’s the only team in this league over a thousand, he’s ninety points clear of second, and he’s 4-3 and fifth. That prediction of mine about him finishing with the most points and not finishing first is aging like a fine wine in a cellar nobody can find.',
      },
      { type: 'heading', text: 'Justin Won The Ugliest Game Ever Played Here And I Mean That As A Compliment' },
      {
        type: 'paragraph',
        text: 'Justin beat Keshia 107.9 to 102.3. That 107.9 is the lowest winning score in the history of this league, taking the record off Jay, who set it in week 5, who took it off somebody else in week 1. The bar is in a basement and we keep finding stairs.',
      },
      {
        type: 'paragraph',
        text: 'He took four awards for it: The Cat Burglar for the lowest winning score, The Photo Finish for the closest game, The Control Group for finishing 3.5 off his projection, and The Bench Bum for the 19.8 he left behind getting there. That’s the full emotional range of a single football afternoon.',
      },
      {
        type: 'paragraph',
        text: 'Elsewhere, Chenell trailed by 44.0 during Sunday night football and won by 6.8, which is Sweatin’ It Out, and she started the best lineup her roster allowed getting there, which is The Mastermind. Dak Prescott was 26 percent of her, so that’s The One Man Army too.',
      },
      {
        type: 'paragraph',
        text: 'She did all of that on the night her entire Baltimore operation was being dismantled in front of her. Three awards out of a week that should have broken her, which is roughly the fourth time this season I’ve had to write some version of that sentence about Chenell.',
      },
      {
        type: 'paragraph',
        text: 'Mike put 138.6 on Jesse. Colin beat James. Both are 5-2, four teams sit on that record, and the gap between first and seventh in this league is currently one game.',
      },
      { type: 'heading', text: 'THE INVOICE' },
      {
        type: 'paragraph',
        text: 'It’s a long one. Seven calls came due and I went three for seven, which for a man who files these in writing isn’t a great look.',
      },
      {
        type: 'paragraph',
        text: 'Keshia’s 191.3 standing as the season high: wrong, by 7.4, in twelve days. Jay back in the top two by week 8: correct, a week early. Colin starting Tyler Shough again in week 7: correct, 16.82, and I said at the time I’d have nothing further to say about it, which remains the plan.',
      },
      {
        type: 'paragraph',
        text: 'Then Monday night, where I went one for four. I said Bree holds against Chenell and that Dak Prescott and Javonte Williams wouldn’t find the 44.0 she needed. They found 50.78. I said Saquon Barkley would clear 19.8 and steal it for Keshia; he played, managed 14.1, and Keshia lost by 5.7. I said Jay holds and Tyler finishes 4-3 with the most points in the league, which is the one I got.',
      },
      {
        type: 'paragraph',
        text: 'And then there’s the other one, which is becoming a genre. I predicted the Cowboys defense would outscore Tanner McKee on Monday night. The Cowboys defense scored 4.0. McKee scored 13.54.',
      },
      {
        type: 'paragraph',
        text: 'That’s now two weeks running that I’ve picked a defense to outscore a quarterback and been beaten by double digits. Last week it was the 49ers against Jayden Daniels. I have no explanation, no defense of my own, and apparently no ability to stop.',
      },
      { type: 'heading', text: 'FINDINGS' },
      {
        type: 'paragraph',
        text: 'Three calls for week 8. The byes are Houston, New Orleans, the Giants and San Francisco, so nobody is getting a prediction about a man who isn’t playing, and I’m specifically not saying anything about Colin’s quarterback, who’s one of them.',
      },
      {
        type: 'paragraph',
        text: 'Evan makes the playoffs from 3-4. He owns the highest score in league history, the most explosive roster anybody has assembled this year, and a record that says none of it has worked. One of those three things is about to stop being true.',
      },
      {
        type: 'paragraph',
        text: 'Mike finishes top four with the fewest points of any team in it. He’s 5-2 on 777.5 points, which is two hundred and forty-nine fewer than Tyler, who’s 4-3. Mike is winning this league by being in the right rooms rather than the loudest ones, and I’ve decided to respect it.',
      },
      {
        type: 'paragraph',
        text: 'And Doug finishes last in this league and does not finish last in points scored. He’s 1-6 with the ninth-most points, which means three teams are scoring less than him and beating him anyway. That is not variance any more, that is a haunting.',
      },
      {
        type: 'paragraph',
        text: 'The laboratory is closed. Evan, enjoy the record. Everybody else, enjoy the fact that it bought him nothing.',
      },
    ],
  },
  {
    slug: 'week-7-tonight-splits-the-waiting-room',
    series: 'miracles',
    week: 7,
    title: 'Tonight Splits The Waiting Room In Half',
    summary:
      'Seven of you are 4-2, and three of this week’s games are 4-2 against 4-2, so three of you are 4-3 by Tuesday whatever happens in Philadelphia. Chenell needs Dak Prescott and Javonte Williams to find 44.0. Tyler needs the Cowboys defense to outscore CeeDee Lamb and Dallas Goedert by 11.3. Keshia needs Saquon Barkley, questionable, to find 19.8.',
    publishedAt: '2026-10-26',
    published: true,
    author: BURNER,
    coverImage: '/recaps/week-7-miracles.jpg',
    coverAlt: 'A lone football player in silhouette kneels in floodlit haze beside an empty bench, his helmet on the turf, waiting.',
    predictions: [
      {
        id: 'bree-holds-chenell',
        claim: 'Bree holds. Dak Prescott and Javonte Williams do not find the 44.0 Chenell needs, and Chenell is 4-3.',
        verdict: 'wrong',
        resolvedWeek: 7,
        resolution:
          'Prescott and Williams combined for 50.78 against the 44.0 she needed. '
          + 'Chenell won by 6.8 and is 5-2.',
      },
      {
        id: 'jay-holds-tyler',
        claim: 'Jay holds. The Cowboys D/ST does not outscore CeeDee Lamb and Dallas Goedert by 11.3, and Tyler is 4-3 with the most points in the league.',
        verdict: 'correct',
        resolvedWeek: 7,
        resolution:
          'The Cowboys defense managed 4.0 against 29.2 from Lamb and Goedert. '
          + 'Jay held and Tyler is 4-3 on 1,026.3 points, the only team over a '
          + 'thousand.',
      },
      {
        id: 'barkley-steals-it',
        claim: 'Saquon Barkley plays, clears 19.8, and Keshia comes from behind on Justin.',
        verdict: 'wrong',
        resolvedWeek: 7,
        resolution:
          'He played and managed 14.1. Keshia lost by 5.7 to the lowest winning '
          + 'score in league history.',
      },
      {
        id: 'cowboys-dst-beats-mckee',
        claim: 'The Cowboys D/ST outscores Tanner McKee on Monday night.',
        verdict: 'wrong',
        resolvedWeek: 7,
        resolution:
          'The Cowboys defense scored 4.0 and McKee scored 13.54. That is two '
          + 'weeks running I have picked a defense over a quarterback and lost '
          + 'by double digits.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Last Monday I told you the whole table was about to be 4-2, and the table obliged, which is the most cooperative thing this league has done for me all year. Seven of you walked into week 7 at 4-2, and I called it a waiting room. Tonight a man comes out with a clipboard and starts reading names.',
      },
      {
        type: 'paragraph',
        text: 'Here’s the part I’d like to believe the schedule did on purpose. Three of this week’s matchups are 4-2 against 4-2: Jay and Tyler, Colin and James, Bree and Chenell. That means three of you are 4-3 on Tuesday morning no matter what happens in Philadelphia tonight, three of you are 5-2, and the only questions left are which three, and how much screaming is involved.',
      },
      {
        type: 'paragraph',
        text: 'The building is Lincoln Financial Field, Cowboys at Eagles, 8:15 Eastern on ABC. Both teams are 2-4, which makes this less a rivalry game than a support group with a kickoff time. Philadelphia has lost four straight and starts Tanner McKee for the second week running, because Jalen Hurts is on injured reserve with blood clots. I have a lab coat and a microphone. Neither one of those is a medical degree, so that is where I stop.',
      },
      {
        type: 'paragraph',
        text: 'In his first start McKee went 26 of 45 for 215 yards and a touchdown, got sacked three times, and lost 25-14 to Carolina. He does it tonight without DeVonta Smith or Dontayvion Wicks, both ruled out. Saquon Barkley is questionable with a hamstring after missing two games, and the word on him comes about ninety minutes before kickoff. Seven of you have somebody in this game, and four of those matchups are still breathing.',
      },
      { type: 'heading', text: 'THE BOARD, AS OF THIS MORNING' },
      {
        type: 'paragraph',
        text: 'One paragraph of organization, as required by a contract I’ve never read. Two rows are finished in every sense but the clerical, and the other four come down to one game.',
      },
      {
        type: 'scoreboard',
        live: true,
        rows: [
          { top: 'Burrow My Burden', topScore: 198.7, bottom: 'Nobody Knows', bottomScore: 113.2, note: 'Evan has nobody. Doug has a kicker.' },
          { top: 'Dad Bod', topScore: 130.7, bottom: 'Tyler’s Talented Team', bottomScore: 119.4, note: 'Lamb and Goedert vs the Cowboys D/ST' },
          { top: 'PKM Playmakers', topScore: 125.0, bottom: 'Mr. Anderson', bottomScore: 85.7, note: 'Tanner McKee vs George Pickens' },
          { top: 'Nix Pix a Puka Six', topScore: 124.2, bottom: 'Soft Tissue Issues', bottomScore: 93.9, note: 'nobody left on either side' },
          { top: 'Substation Superstars', topScore: 107.9, bottom: 'All Bark, All Bite', bottomScore: 88.2, note: 'Justin has nobody. Keshia has Barkley.' },
          { top: 'Bree’s Badass Boys', topScore: 105.8, bottom: 'Da Reigning Champ', bottomScore: 61.8, note: 'Bree has nobody. Chenell has Dak and Javonte.' },
        ],
      },
      { type: 'heading', text: 'THE MIRACLE: Chenell Needs Dak Prescott And Javonte Williams To Find 44.0' },
      {
        type: 'paragraph',
        text: 'Bree’s Badass Boys 105.8, Da Reigning Champ 61.8. Bree’s roster is done for the week. Chenell has two men left, Dak Prescott projected 20.7 and Javonte Williams at 15.6, which comes to 36.3 against a deficit of 44.0. So the defending champion needs her quarterback and her running back to beat their combined projection by 7.7, against a defense whose team has lost four in a row and is presumably sick of hearing about it.',
      },
      {
        type: 'paragraph',
        text: 'I want to talk about Chenell’s temperament, because I’ve been studying it since September. In week 1 she was down 46.7 and didn’t break a sweat. In week 5 she replaced her quarterback on a Wednesday with the man standing directly behind him and never explained herself to anybody. She is the only person in this league who treats a 44-point hole the way the rest of us treat a slow checkout line, and I’ve never once seen evidence that she’s wrong to.',
      },
      {
        type: 'paragraph',
        text: 'Every Dak touchdown to CeeDee Lamb pays Chenell and Jay and costs Tyler. Every one to George Pickens pays Chenell and Jesse at the same time, which is the closest those two will ever come to a joint venture. Dak Prescott is the most-rooted-for and most-rooted-against man in this league tonight, frequently on the same snap.',
      },
      { type: 'heading', text: 'THE ONE THAT DOESN’T MAKE SENSE: Tyler Needs A Defense To Outscore Two Receivers By 11.3' },
      {
        type: 'paragraph',
        text: 'Dad Bod 130.7, Tyler’s Talented Team 119.4. Jay has CeeDee Lamb at 15.1 and Dallas Goedert at 8.8. Tyler has the Cowboys D/ST at 8.5, and ESPN has Jay holding by 26.6. For Tyler to come back, his defense has to outscore Jay’s two pass catchers by 11.3, which in plain English means Dallas has to smother Tanner McKee while Dallas’s own best receiver vanishes.',
      },
      {
        type: 'paragraph',
        text: 'Tyler has scored 902.9 points this season, more than anybody in this league by a distance, and he’s about to spend Monday night rooting for the Cowboys’ defense and against the Cowboys’ best player. That’s not a fantasy strategy, that’s how every Cowboys fan I’ve ever met already watches football. Lamb leads the NFL in targets by at least one count, so Tyler is asking the most-thrown-to man in the sport to have a quiet evening in a game Dallas badly needs. Jay, meanwhile, needs nothing at all, and is about to get to 5-2 from the couch, which is where Jay does his best work.',
      },
      { type: 'heading', text: 'THE ONE THAT DEPENDS ON A HAMSTRING: Keshia Needs Saquon Barkley To Find 19.8' },
      {
        type: 'paragraph',
        text: 'Substation Superstars 107.9, All Bark, All Bite 88.2. Justin’s roster is finished. Keshia has Saquon Barkley, projected 13.9, and needs 19.8 from him. He was limited in practice Thursday and Friday, logged a full session Saturday, and is listed questionable, which I report flat and leave there. If he plays and gets loose against a Dallas defense, this is the one comeback on the board that only needs one man to have a good night rather than a historic one.',
      },
      {
        type: 'paragraph',
        text: 'If he doesn’t play, the decision lands about ninety minutes before kickoff, and lineups stay open until then. Keshia, whatever you’ve got on that bench, have it warmed up and standing by the door.',
      },
      {
        type: 'paragraph',
        text: 'As for Justin, he’s 1-5 and leading, which is a sentence he hasn’t been able to say in a while. He’s about to spend three hours rooting against a running back who missed two weeks, from a seat he can’t leave, with no lineup decisions left to make. For a man whose last Monday began with a ruled-out player sitting in his lineup at breakfast like a coat on a bar stool, that’s honestly a step forward.',
      },
      { type: 'heading', text: 'THE FORMALITIES' },
      {
        type: 'paragraph',
        text: 'Colin leads James 124.2 to 93.9 and neither of them has anybody left, so that’s the number they take into Tuesday. Colin is about to be 5-2. James, who swept four awards last week and was the most efficient man in the building, is about to be one of the three 4-3s, which is the full arc of a person who read last week’s report and apparently stopped there.',
      },
      {
        type: 'paragraph',
        text: 'Mike leads Jesse 125.0 to 85.7. Jesse needs George Pickens to outscore Mike’s quarterback, who is Tanner McKee, by 39.3. Mike doesn’t need a single point from McKee tonight and has him anyway, which is the most Mike thing in this entire post: a man holding a lottery ticket after the drawing, just to feel something.',
      },
      {
        type: 'paragraph',
        text: 'And Evan leads Doug 198.7 to 113.2, with nobody left. Doug has Brandon Aubrey, projected 7.8, and needs 85.5. Aubrey is an excellent kicker. 85.5 isn’t a kicking total, it’s a ransom note.',
      },
      {
        type: 'paragraph',
        text: 'Evan is a man who has spent half his Mondays this season on the observation deck with nobody left, holding a lead and watching somebody else’s player try to take it from him. Tonight he’s up there again, except his number is 198.7, the highest score anybody in this league has posted this season, and the coffee finally tastes fine. He’s about to be 3-4. The Observation Deck Regular has, at long last, bought a season pass.',
      },
      {
        type: 'paragraph',
        text: 'Which also means I owe Keshia an apology. I said her 191.3 from week 5 would stand as the season high. Evan has nobody left, so that number isn’t moving, and I’ll take the loss formally tomorrow, out loud, where everybody can watch.',
      },
      { type: 'heading', text: 'WHAT I THINK HAPPENS' },
      {
        type: 'paragraph',
        text: 'On the record, to be read back to me in about thirty hours by people who will enjoy it far too much.',
      },
      {
        type: 'paragraph',
        text: 'Bree holds. Dak and Javonte have a perfectly decent night and come up short of 44.0, and the reigning champion is 4-3 and completely unbothered about it, which will be the most frightening thing in the standings.',
      },
      {
        type: 'paragraph',
        text: 'Jay holds too. Lamb gets his, the Dallas defense doesn’t get enough, and Tyler finishes the night 4-3 with the most points in the league, which is fast becoming his whole personality and is also an open prediction of mine I’m quietly enjoying.',
      },
      {
        type: 'paragraph',
        text: 'And the loud ones, plural, because I learn nothing. Barkley plays, finds 19.8, and Keshia comes from behind on Justin. And the Cowboys defense outscores Tanner McKee. Yes, I called a defense over a quarterback last Monday and Jayden Daniels put 25 on it. I don’t care. A backup quarterback with no receivers against a team that needs this game is the same bet with better odds, and a man who stops making the bet after one bad night was never a scientist.',
      },
      {
        type: 'paragraph',
        text: 'Kickoff is 8:15. Chenell, root for Dak. Tyler, root for the Dallas defense and against Dallas’s best player, which should come naturally. Keshia, refresh the injury report at 6:45 like it owes you money. The lab reopens Tuesday with the answers.',
      },
    ],
  },
  {
    slug: 'week-6-objection-sustained',
    week: 6,
    title: 'I Filed An Objection About Jay And Somebody Processed It',
    summary:
      'Last week Jay was alone in first place with the worst winning score ever recorded. This week he posted the worst score in the league, lost by 53.9, and fell to fourth. James swept four awards and got 36.3 from the quarterback who once took a knee rather than win him a game. And Colin ignored me completely, started Tyler Shough again, and was paid 33.0 for it.',
    publishedAt: '2026-10-20',
    published: true,
    coverImage: '/recaps/week-6.jpg',
    coverAlt:
      'A football player silhouetted on hands and knees on the turf under stadium floodlights, head down, light flaring behind him.',
    author: BURNER,
    predictions: [
      {
        id: 'jay-back-in-two',
        claim: 'Jay is back in the top two by the end of week 8.',
        verdict: 'correct',
        resolvedWeek: 7,
        resolution:
          'He is first, with a week to spare, after beating Tyler 159.9 to 123.4.',
      },
      {
        id: 'colin-keeps-shough',
        claim: 'Colin starts Tyler Shough again in week 7, and I have nothing further to say on the matter.',
        verdict: 'correct',
        resolvedWeek: 7,
        resolution: 'He did. Shough went for 16.82 and Colin won by 30.3.',
      },
      {
        id: 'evan-moves-most',
        claim: 'Evan finishes the season having made more roster moves than anybody in this league, and finishes below .500 anyway.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Last Tuesday I stood here and filed a formal objection to Jay being in first place, on the grounds that he’d got there with the worst winning score in the history of this league, by the narrowest margin in the history of this league, while sitting on 35.4 points he never used.',
      },
      {
        type: 'paragraph',
        text: 'I’d like to thank whoever processed that paperwork, because the response was extremely thorough.',
      },
      {
        type: 'paragraph',
        text: 'Jay scored 90.9 on Sunday. That’s the lowest total anybody in this league posted, which is The Dumpster Fire. He lost by 53.9, which is the largest beating of the week and The Public Execution. He fell three places, which is Free Fallin’. Four awards, none of them the good kind.',
      },
      {
        type: 'paragraph',
        text: 'He also took The Socialist, for having only 19.2 points between his best starter and his worst — total equality, achieved by having nobody turn up at all. The man was in first place seven days ago. I don’t want to say I caused this, but I would like it on the record that I asked.',
      },
      { type: 'heading', text: 'TEXANS 34, JAGUARS 31 — Two Of You Had Quarterbacks In London And Both Of You Won' },
      {
        type: 'paragraph',
        text: 'At Wembley, of all places, Trevor Lawrence and C.J. Stroud spent three hours one-upping each other in front of a crowd that mostly wanted to see somebody get hit. Stroud threw for 312 yards and three touchdowns. Lawrence answered all afternoon and finished on 36.34, the best quarterback score in this league this week.',
      },
      {
        type: 'paragraph',
        text: 'James had Lawrence. Bree had Stroud for 29.98. Neither of them had to care who actually won the football game, which is the single greatest luxury this hobby offers.',
      },
      {
        type: 'paragraph',
        text: 'It got better. Travis Hunter picked Stroud off in the end zone, and Cam Little — James’s kicker, the man he signed in week 5 after the Fitzgerald incident — came on and hit a 60-yard field goal to tie it. Ka’imi Fairbairn won it back from 49 as time expired, which cost Jacksonville the game and cost James nothing whatsoever.',
      },
      {
        type: 'paragraph',
        text: 'Now. I need to talk about Trevor Lawrence for a moment, because there’s unfinished business.',
      },
      {
        type: 'paragraph',
        text: 'In week 3 that man reached the one-yard line with his team up 28-6, took a knee rather than score, and handed the touchdown to Bhayshul Tuten on the next play — a running back in Tyler’s flex. James won that week by 4.8. The margin was smaller than the points his own quarterback politely declined to take.',
      },
      {
        type: 'paragraph',
        text: 'This week Lawrence put 36.34 on the board and James won by 53.9. I’m not saying the ledger is settled. I’m saying it’s been noted, in pen, and that Lawrence may consider the matter closed from my end.',
      },
      { type: 'heading', text: 'BILLS 33, RAIDERS 30 — James Picked A Man Up On Tuesday And Was Paid On Sunday' },
      {
        type: 'paragraph',
        text: 'Buffalo led this thing 23-13 going into the fourth and then had to survive a 17-point Raiders quarter to leave with it. Tre Tucker caught a 44-yard touchdown from Kirk Cousins with 1:32 on the clock to bring Las Vegas within three, and that catch is the reason this section exists.',
      },
      {
        type: 'paragraph',
        text: 'Tucker was a free agent on Tuesday. James picked him up, started him, and watched him clear an 8.6 projection by 15.6 on the way to 24.2 points and the receiver crown. That’s The Waiver Wire Wizard and Fantasy Nostradamus in one transaction.',
      },
      {
        type: 'paragraph',
        text: 'Kirk Cousins threw that touchdown for 23.52 of Bree’s points, so she was quietly collecting from both ends of the same play, which is becoming a habit with her. Josh Allen went for 255 yards and two scores and gave Jesse 22.3 against a 29.2 projection — a perfectly respectable afternoon that we will return to, because Jesse lost by 5.1 and I want to build to it properly.',
      },
      { type: 'heading', text: 'SAINTS 34, GIANTS 27 — The Part Where I Eat My Own Homework' },
      {
        type: 'paragraph',
        text: 'New Orleans snapped a three-game losing streak at MetLife, built a 24-point lead, and then held on while the Giants came back at them. Tyler Shough went 16 of 30 for 144 yards and three touchdown passes, then ran one in himself on a sneak. Four scores. Thirty-two point nine six fantasy points.',
      },
      {
        type: 'paragraph',
        text: 'Last Tuesday I predicted that Colin would start a different quarterback this week. I checked the bye schedule, I was very pleased with myself about checking the bye schedule, and I wrote it down as a finding.',
      },
      {
        type: 'paragraph',
        text: 'Colin started Tyler Shough.',
      },
      {
        type: 'paragraph',
        text: 'I described that loyalty last week as “a version that’s simply not having looked recently.” It paid 33.0 and won him the week by 33.0, which is a coincidence I find personally offensive. Isaiah Likely took 20.9 and the tight end crown out of the losing side for Chenell, who has now had the best tight end in this league in three separate weeks and has never once mentioned it.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'One organized paragraph a week, as agreed. Note that five of these six were decided by more than sixteen points, which after last week’s festival of half-point margins feels like the league overcorrecting on purpose.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Soft Tissue Issues', topScore: 144.7, bottom: 'Dad Bod', bottomScore: 90.9, note: 'largest margin of the week' },
          { top: 'Bree’s Badass Boys', topScore: 137.3, bottom: 'Nobody Knows', bottomScore: 120.4 },
          { top: 'Nix Pix a Puka Six', topScore: 135.5, bottom: 'Substation Superstars', bottomScore: 102.5 },
          { top: 'Tyler’s Talented Team', topScore: 132.3, bottom: 'Mr. Anderson', bottomScore: 127.2 },
          { top: 'Da Reigning Champ', topScore: 117.1, bottom: 'All Bark, All Bite', bottomScore: 112.6, note: 'closest game of the week' },
          { top: 'PKM Playmakers', topScore: 113.5, bottom: 'Burrow My Burden', bottomScore: 91.5 },
        ],
      },
      { type: 'heading', text: 'James Took Four Awards And Did Not Leave A Single Point Behind' },
      {
        type: 'paragraph',
        text: 'The Mastermind, The Prime Specimen, Fantasy Nostradamus and The Waiver Wire Wizard. One manager, one Sunday, four trophies off the same roster.',
      },
      {
        type: 'paragraph',
        text: 'The Mastermind is the one that should worry the rest of you. It means that out of everything on his roster, there was no better lineup available — not one point sitting anywhere it shouldn’t have been. Lawrence 36.34, McCaffrey 26.2, Tucker 24.2, and a kicker who hit from sixty.',
      },
      {
        type: 'paragraph',
        text: 'It wasn’t even a clean week for him. Patrick Mahomes gave him 11.48 against a 23.3 projection and Brock Bowers managed 9.0 on a 16.19. He won by 53.9 anyway, with two of his better players actively working against him, which tells you roughly everything about the afternoon Jay was having.',
      },
      { type: 'heading', text: 'Seven Of You Are 4-2 And I Have Stopped Making Predictions About It' },
      {
        type: 'paragraph',
        text: 'Tyler, Chenell, Bree, Jay, Colin, Mike and James. Seven teams, one record, separated by nothing but points scored. In week 3 I predicted the logjam would be gone by week 5. It has instead recruited.',
      },
      {
        type: 'paragraph',
        text: 'Tyler’s on top of it with 902.9 points for the season, which is ninety-two more than anybody else and still only worth 4-2. Mike is sixth in the same group on 638.9, which is two hundred and sixty-four points fewer. Those two men have the identical record. I want somebody to explain that to me slowly.',
      },
      {
        type: 'paragraph',
        text: 'Below them it’s thinning out fast. Evan, Keshia and Jesse are 2-4. Doug and Justin are 1-5, and Doug has now scored 748.2 points — more than Mike, who is 4-2 and sixth — on his way to one win. I keep writing variations of this sentence about Doug and it keeps being true.',
      },
      { type: 'heading', text: 'The Rest Of The Carnage' },
      {
        type: 'paragraph',
        text: 'Mike won the week’s quietest game and took four awards for it: The Cat Burglar for the lowest winning score, Sweatin’ It Out for a 36.5-point hole he climbed out of during the early games, The One Man Army because Drake Maye was 26 percent of him, and The Understudy for leaving Daniel Jones on the bench for 17.76.',
      },
      {
        type: 'paragraph',
        text: 'Two weeks ago I called Maye’s 47.46 the best performance in league history. He followed it with 29.8 and that now reads as a quiet week. Mike is 4-2. The week 2 prediction that he wouldn’t finish last is aging like something expensive.',
      },
      {
        type: 'paragraph',
        text: 'Chenell beat Keshia by 4.5 in the closest game of the week, which is The Photo Finish, and she did it while Derrick Henry gave her 4.5 against a 17.64 projection. Her margin of victory and her running back’s entire afternoon were the same number. I have checked this twice.',
      },
      {
        type: 'paragraph',
        text: 'Jesse scored 127.2 and lost by 5.1 to Tyler, which is The Bad Beat and the third week running that something structurally unfair has happened to that roster. In week 1 I called it the most dangerous in the league. It’s 2-4 and tenth, and I’m carrying that prediction around like a receipt for something I no longer own.',
      },
      {
        type: 'paragraph',
        text: 'Evan made 19 roster moves and lost by 22.0, which is The Galaxy Brain and a genuinely impressive ratio of effort to outcome. Bree took The Bench Bum with 23.2 unused and The Control Group by finishing 0.9 off her projection, and she still won by 16.9, because beating Doug this season requires almost nothing of anybody.',
      },
      {
        type: 'paragraph',
        text: 'Keshia lost by 4.5 and is 2-4 while sitting on the fourth-most points in this league, which is the Doug condition caught at an earlier stage. Justin lost by 33.0 and is 1-5, and Brock Purdy handed him 19.36 against a 26.64 projection on a night he needed a great deal more than that.',
      },
      { type: 'heading', text: 'THE INVOICE' },
      {
        type: 'paragraph',
        text: 'One item this week and it’s a big one. I said Colin starts a different quarterback in week 6. He did not. Shough went for 32.96 and won him the game by a margin identical to his own score, and I’d like to be clear that I’m not annoyed about being wrong, I’m annoyed about the arithmetic showing off.',
      },
      {
        type: 'paragraph',
        text: 'The Monday board treated me better. I said Bree holds and Doug goes to 1-5, which needed Jayden Daniels not to outscore George Kittle and Eddy Pineiro by 22.5. Daniels managed 25.0, the two of them combined for 19.4, and the gap came in at 5.6.',
      },
      {
        type: 'paragraph',
        text: 'I also said Colin holds and Justin joins Doug in the basement, which needed Brock Purdy not to beat Mike Evans by 41.5. Purdy went 19.36 against Evans’s 10.9. Both held, and the basement has bunk beds exactly as advertised.',
      },
      {
        type: 'paragraph',
        text: 'Then I got greedy. I predicted the 49ers defense would outscore Jayden Daniels on Monday night, described it in writing as “the loud one,” and invited all of you to read it back to me in thirty hours. The 49ers defense scored 7.0. Daniels scored 25.0.',
      },
      {
        type: 'paragraph',
        text: 'Everything else is still open. Jesse’s roster is aging badly. Mike not finishing last is aging extremely well. Doug hasn’t made another forty-move week yet, and Evan hasn’t had his second bad beat, though he’s had every other kind of week available.',
      },
      {
        type: 'paragraph',
        text: 'And Keshia’s 191.3 from week 5 is still standing as the season high. The closest anybody came on Sunday was James at 144.7, which is forty-six points short. That one’s looking better by the week, so naturally I expect to lose it around Thanksgiving.',
      },
      { type: 'heading', text: 'FINDINGS' },
      {
        type: 'paragraph',
        text: 'Here’s what we learned. Trevor Lawrence settles his debts eventually. Colin doesn’t read this column, or reads it and does the opposite, and either way he’s 4-2. And an objection filed in this laboratory on a Tuesday can apparently reach the top of the table by the following Sunday.',
      },
      {
        type: 'paragraph',
        text: 'Three calls for week 7, and the byes are Buffalo, Jacksonville, the Chargers and Washington, so nobody is getting a prediction about a man who isn’t playing. We’ve been through that.',
      },
      {
        type: 'paragraph',
        text: 'Jay is back in the top two by the end of week 8. He’s 4-2 with the fourth-most points in the league and he just had the worst week of anybody’s season — that’s a floor, not a trend, and I’ve used that line before about somebody who then went and made me look clever.',
      },
      {
        type: 'paragraph',
        text: 'Colin starts Tyler Shough again in week 7. New Orleans is playing. I have nothing further to say on the matter and I’d appreciate it if nobody brought it up.',
      },
      {
        type: 'paragraph',
        text: 'And Evan finishes this season having made more roster moves than anybody in this league, and finishes below .500 anyway. Nineteen in one week is not a strategy, it’s a nervous habit with a waiver wire attached.',
      },
      {
        type: 'paragraph',
        text: 'The laboratory is closed. Somebody go and check on Jay.',
      },
    ],
  },
  {
    slug: 'week-6-the-whole-table-is-about-to-be-4-2',
    series: 'miracles',
    week: 6,
    title: 'The Whole Table Is About To Be 4-2',
    summary:
      'Jay is the only 4-1 team in the league, trails James by 27.7 and has nobody left. Five of you are headed for 4-2 whatever happens in Santa Clara, and seven if Bree and Colin hold. Doug needs Jayden Daniels to outscore George Kittle and a kicker by 22.5. Justin needs Brock Purdy to outscore his own best receiver by 41.5.',
    publishedAt: '2026-10-19',
    published: true,
    author: BURNER,
    predictions: [
      {
        id: 'bree-holds-doug-1-5',
        claim: 'Bree holds. Jayden Daniels does not outscore Kittle and Pineiro by 22.5, and Doug is 1-5.',
        verdict: 'correct',
        resolvedWeek: 6,
        resolution:
          'Daniels went for 25.0, Kittle and Pineiro combined for 19.4, and the '
          + 'gap was 5.6 against the 22.5 Doug needed. Bree held and Doug is 1-5.',
      },
      {
        id: 'colin-holds-justin-1-5',
        claim: 'Colin holds. Purdy does not outscore Mike Evans by 41.5, and Justin is 1-5 alongside Doug.',
        verdict: 'correct',
        resolvedWeek: 6,
        resolution:
          'Purdy managed 19.36 against Mike Evans’s 10.9 — a gap of 8.5 against '
          + 'the 41.5 Justin needed. Colin held and Justin is 1-5.',
      },
      {
        id: 'niners-dst-beats-daniels',
        claim: 'The 49ers D/ST outscores Jayden Daniels on Monday night.',
        verdict: 'wrong',
        resolvedWeek: 6,
        resolution:
          'The 49ers defense scored 7.0. Jayden Daniels scored 25.0. I called '
          + 'this one “the loud one” and asked to have it read back to me, which '
          + 'is exactly what happened.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Last Monday I told you one running back was holding up the entire table, and Kyren Williams held it by half a point, and Jay walked into this week as the only 4-1 team in the league. I want you to keep that picture in your head for a moment, because this morning the table is on the floor.',
      },
      {
        type: 'paragraph',
        text: 'Jay has 90.9 points and nobody left to add to them. James has 118.5 and Christian McCaffrey still to come. The man at the top of this league trails by 27.7 and spends tonight on the observation deck with a pencil, checking arithmetic that has stopped taking questions.',
      },
      {
        type: 'paragraph',
        text: 'So here is the state of the experiment. Five of you are headed for 4-2 no matter what happens in Santa Clara tonight, and if Bree and Colin hold their leads, it’s seven. Seven people at 4-2 isn’t a standings table. It’s a waiting room, and somebody has taken all the magazines.',
      },
      {
        type: 'paragraph',
        text: 'Commanders at 49ers, 8:15 Eastern on ESPN and ABC, Levi’s Stadium. San Francisco is 5-0 and favored by seven and a half. Washington is 1-3-1, coming off an overtime loss to the Giants in which it had a field goal available and nobody on the sideline apparently in charge of the clock. The total is 52.5, six of you have somebody in it, and only two of those games can still change hands.',
      },
      { type: 'heading', text: 'THE BOARD, AS OF THIS MORNING' },
      {
        type: 'paragraph',
        text: 'I’m required to be organized for exactly one paragraph and I resent it the way a cat resents a bath. Two rows on this board have nobody left on either side, and two more have nobody left on one.',
      },
      {
        type: 'scoreboard',
        live: true,
        rows: [
          { top: 'Bree’s Badass Boys', topScore: 117.9, bottom: 'Nobody Knows', bottomScore: 95.4, note: 'Kittle and Pineiro vs Jayden Daniels' },
          { top: 'Nix Pix a Puka Six', topScore: 124.6, bottom: 'Substation Superstars', bottomScore: 83.1, note: 'Mike Evans vs Brock Purdy' },
          { top: 'Soft Tissue Issues', topScore: 118.5, bottom: 'Dad Bod', bottomScore: 90.9, note: 'Jay has nobody. James has McCaffrey.' },
          { top: 'PKM Playmakers', topScore: 106.5, bottom: 'Burrow My Burden', bottomScore: 91.5, note: 'Evan has nobody. Mike has the 49ers D/ST.' },
          { top: 'Tyler’s Talented Team', topScore: 132.3, bottom: 'Mr. Anderson', bottomScore: 127.2, note: 'nobody left on either side' },
          { top: 'Da Reigning Champ', topScore: 117.1, bottom: 'All Bark, All Bite', bottomScore: 112.6, note: 'nobody left on either side' },
        ],
      },
      { type: 'heading', text: 'THE MIRACLE: Doug Needs Jayden Daniels To Outscore George Kittle And A Kicker By 22.5' },
      {
        type: 'paragraph',
        text: 'Bree’s Badass Boys 117.9, Nobody Knows 95.4. Doug has one man left, Jayden Daniels, projected 22.7. Bree has two, George Kittle at 12.4 and Eddy Pineiro at 8.7, and ESPN has her holding by 20.9. Put plainly, Doug needs his quarterback to outscore Bree’s tight end and kicker combined by 22.5, and if those two simply hit their numbers, that means Daniels needs something north of 43.',
      },
      {
        type: 'paragraph',
        text: 'Daniels came back last week after missing two games with a dislocated elbow. My doctorate is in Applied Gridiron Sciences, which the licensing board has been extremely clear is not the same thing. In that return he went 17 of 25 for 199 yards and ran in two touchdowns, which was a good afternoon. Doug needs roughly two of those afternoons, stacked, inside one evening, against a defense that allows the third-fewest points in the league.',
      },
      {
        type: 'paragraph',
        text: 'Here’s what I find beautiful about Doug. Last week he put up 172.8 points and lost. This week he needs a 43-point quarterback night to avoid 1-5. Doug isn’t a fantasy manager, he’s a man who keeps lighting the Bunsen burner under the wrong flask and then filing a complaint about the temperature of the room.',
      },
      {
        type: 'paragraph',
        text: 'And look at who’s rooting against him. Every 49ers drive that stalls in the red zone pays Bree three points through Pineiro. Every Daniels sack pays Mike, whose matchup is finished in every sense except the clerical, and who therefore has the 49ers defense as a pure hobby tonight. Mike has nothing to play for and is the one person in the league who can personally ruin Doug’s evening, which is the most dangerous kind of scientist there is.',
      },
      {
        type: 'paragraph',
        text: 'For what it’s worth on that front, Washington’s line is allowing pressure on more than 38 percent of dropbacks. San Francisco will be without Nick Bosa. Those two facts are about to have a long argument on national television, and Doug watches every snap.',
      },
      { type: 'heading', text: 'THE LONG SHOT: Justin Needs Brock Purdy To Outscore Mike Evans By 41.5' },
      {
        type: 'paragraph',
        text: 'Nix Pix a Puka Six 124.6, Substation Superstars 83.1. Colin has Mike Evans left, projected 12.6 and listed questionable while playing through a rib injury, which I report flat and leave there. Justin has Brock Purdy, projected 26.6, and the projections have Colin holding by 27.5.',
      },
      {
        type: 'paragraph',
        text: 'Now the geometry, because it’s cruel. Purdy leads the NFL with 13 touchdown passes, and Evans is one of his favorite targets. Every time Purdy finds Evans in the end zone, both managers get paid, and Justin nets roughly nothing. What Justin needs is a monumental night from his quarterback with the ball going to literally anybody except the receiver who plays for Colin. Kittle, ideally. That helps Bree, which helps Justin not at all, but it does spread the joy around the building.',
      },
      {
        type: 'paragraph',
        text: 'The single most optimistic preview I could find this morning has Purdy throwing for 300 yards and three touchdowns and San Francisco winning 44-7. That’s a fantastic night for a quarterback. It isn’t within shouting distance of 41.5 more than Mike Evans, and that’s the best case anybody in America is willing to put in writing.',
      },
      {
        type: 'paragraph',
        text: 'There’s also a housekeeping matter. Jacory Croskey-Merritt has been ruled out after missing practice all week, and as of this morning he is still sitting in Justin’s lineup, projected 0.0, holding the seat like a coat left on a bar stool. Lineups stay open until kickoff. If there’s anybody on that bench who plays for either of these two teams, now would be the moment, Justin.',
      },
      { type: 'heading', text: 'THE ONE NOBODY CAN FIX: Jay Is 4-1, Trails By 27.7, And Has Nobody Left' },
      {
        type: 'paragraph',
        text: 'Soft Tissue Issues 118.5, Dad Bod 90.9. Jay’s roster is finished. James has McCaffrey, projected 19.2, and doesn’t need a single one of those points. For Jay to stay alone at the top, McCaffrey would have to finish tonight at minus 27.8, which would require him to spend the evening handing the football to the Commanders on purpose.',
      },
      {
        type: 'paragraph',
        text: 'I’d like the league to appreciate the symmetry here. Jay is 4-1 because of the narrowest margin this league has ever recorded, 0.58 points. He is about to be 4-2 because of something in the region of thirty. The universe gave him half a point last Monday and is now sending the invoice with interest.',
      },
      {
        type: 'paragraph',
        text: 'As for James, two weeks ago he lost to a pair of kickers in the same football game. Last week he beat the man I had penciled in at the top of the table. This week he is about to take down the actual top of the table, while his running back shares the backfield with Kaelon Black more than he has in past seasons. James doesn’t need him tonight. He would simply like the points for his self-esteem.',
      },
      { type: 'heading', text: 'THE FORMALITIES' },
      {
        type: 'paragraph',
        text: 'Tyler leads Jesse 132.3 to 127.2 and neither of them has anybody left, so that’s the number they carry into Tuesday. Tyler walked in with more points than anyone in the league and is about to be one of as many as seven people at 4-2, which is the most Tyler outcome I can imagine. Jesse, the roster I once called the most dangerous in the league, is headed to 2-4.',
      },
      {
        type: 'paragraph',
        text: 'Chenell leads Keshia 117.1 to 112.6, both rosters empty. Four and a half points between them, the reigning champion edging toward 4-2 and Keshia headed to 2-4 with nothing left to do about it but watch.',
      },
      {
        type: 'paragraph',
        text: 'Mike leads Evan 106.5 to 91.5, and Evan has nobody left. Evan, welcome back to the observation deck. You had one week off. The coffee hasn’t improved and neither has the view.',
      },
      { type: 'heading', text: 'WHAT I THINK HAPPENS' },
      {
        type: 'paragraph',
        text: 'On the record, to be read back to me in about thirty hours, by people who will enjoy it.',
      },
      {
        type: 'paragraph',
        text: 'Bree holds. Daniels plays well and plays nowhere near well enough, and Doug is 1-5, which is the record of a man who scored 172.8 last week, and I will be bringing that up.',
      },
      {
        type: 'paragraph',
        text: 'Colin holds too, and Justin joins Doug at 1-5. The basement gets bunk beds, and seven of you are 4-2 on Tuesday morning, which means the tiebreaker does all the work this week and I have to read the tiebreaker, which I resent.',
      },
      {
        type: 'paragraph',
        text: 'And the loud one. The 49ers defense, owned by a man with nothing left to play for, outscores Jayden Daniels tonight. ESPN has it at 7.1 against 22.7. I don’t care. Undefeated home team, an offensive line across the field that gives up pressure on more than a third of its dropbacks, and Mike has never once in his life needed a thing to happen and gotten it, so the moment he stops needing it, it arrives.',
      },
      {
        type: 'paragraph',
        text: 'Kickoff is 8:15. Doug, root for your quarterback. Justin, root for yours and against his best receiver. Bree, root for field goals, which is a sentence no human being has ever wanted to hear. The lab reopens Tuesday with the answers.',
      },
    ],
  },
  {
    slug: 'week-5-twelve-records-fell',
    week: 5,
    title: 'Twelve Records Fell And Doug Set One Of Them By Losing',
    summary:
      'Drake Maye produced the best performance in the history of this league and Mike barely had to be in the room for it. Doug scored 172.8 and lost. Jay took over first place with the worst winning score ever recorded, by the narrowest margin ever recorded, while sitting on 35.4 points. And Chenell replaced her quarterback on Wednesday with the man standing directly behind him, which is the single most ruthless thing anybody has done all season.',
    publishedAt: '2026-10-13',
    published: true,
    coverImage: '/recaps/week-5.jpg',
    coverAlt:
      'A quarterback silhouetted at the top of his throwing motion under stadium floodlights, the ball still in his raised hand.',
    author: BURNER,
    predictions: [
      {
        id: 'colin-new-qb',
        claim: 'Colin starts a different quarterback in week 6. New Orleans is not on bye. I checked this time.',
        verdict: 'wrong',
        resolvedWeek: 6,
        resolution:
          'Colin started Tyler Shough again. Shough threw three touchdowns and '
          + 'ran a fourth in for 32.96, and Colin won the week by 33.0 — a margin '
          + 'identical to his quarterback’s score, which I take personally.',
      },
      {
        id: 'tyler-points-no-crown',
        claim: 'Tyler finishes the regular season with more points scored than anybody in the league and does not finish first.',
      },
      {
        id: 'keshia-191-stands',
        claim: 'Keshia’s 191.3 is the highest score anybody posts this season.',
        verdict: 'wrong',
        resolvedWeek: 7,
        resolution:
          'Evan posted 198.7 in week 7, beating it by 7.4 and taking the '
          + 'all-time record. I invited the league to bring this one back to me '
          + 'in January. It took twelve days.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. I want to tell you about my record book, because I suspect it explains something about me that a professional would charge money to unpack. It lives in a drawer in this laboratory and it’s written in pen.',
      },
      {
        type: 'paragraph',
        text: 'The whole appeal of the thing is that it doesn’t change very often. A record falls once a month, maybe twice if the month’s feeling theatrical, and the rest of the time it just sits there being correct — which is all I’ve ever asked of anything.',
      },
      {
        type: 'paragraph',
        text: 'Twelve of its entries are now wrong. All twelve went wrong on the same Sunday afternoon, and I’ve spent the days since standing over an open drawer with a pen in my mouth like a man who’s come home to a burglary.',
      },
      {
        type: 'paragraph',
        text: 'One of you set an all-time league record by losing a football game. I didn’t think that was structurally possible, and I’m not going to be gentle about it, because what he did doesn’t deserve gentle. It deserves a plaque.',
      },
      { type: 'heading', text: 'PATRIOTS 45, RAIDERS 17 — Mike Now Owns The Best Thing That Has Ever Happened Here' },
      {
        type: 'paragraph',
        text: 'Drake Maye completed 26 of 34 for 374 yards and four touchdowns, then ran a fifth in from three yards out purely to be rude about it, and New England removed Las Vegas from the premises 45 to 17.',
      },
      {
        type: 'paragraph',
        text: 'The projection on him that morning was 22.69. He finished on 47.46, the highest score any started player has ever produced in this league, taking down Josh Allen’s 46.82 from week 2 — a figure I stood here and called untouchable, which is a thing I keep doing and keep not learning from.',
      },
      {
        type: 'paragraph',
        text: 'He also cleared his own projection by 24.77, which is a separate record, filed in a separate place, in the same drawer, on the same afternoon. Mike pulled The Prime Specimen, Fantasy Nostradamus and The One Man Army out of a single quarterback, and 39 percent of his entire team output arrived from a man he drafted and then, I’d wager heavily, didn’t think about again until a fortnight ago.',
      },
      {
        type: 'paragraph',
        text: 'I’d remind the room that in week 2 this same manager scored 55.4 with a full roster of professional athletes, and that I stood here and called it a floor rather than a trend. I was being generous the specific way you’re generous to a nephew. That floor now holds the best individual performance in the history of this experiment.',
      },
      { type: 'heading', text: 'STEELERS 34, COLTS 22 — Three Of You Were In This Game And Exactly One Of You Enjoyed It' },
      {
        type: 'paragraph',
        text: 'Pittsburgh beat Indianapolis 34 to 22 behind Jaylen Warren, who put up 188 total yards and scored from 80 out as a receiver in the first quarter and from 50 as a runner in the third. That’s an unusual way to spend an evening.',
      },
      {
        type: 'paragraph',
        text: 'Keshia had him in her lineup for 33.8 against a projection of 15.88, so she’s the one who enjoyed it — and she’s going to come up again later under considerably less pleasant circumstances.',
      },
      {
        type: 'paragraph',
        text: 'Aaron Rodgers threw 22 of 31 for 235 yards and three touchdowns in that same football game, and Tyler watched the entire thing from behind the blast glass, because Rodgers was on his bench. Twenty-eight points, fully visible, doing nothing whatsoever.',
      },
      {
        type: 'paragraph',
        text: 'Meanwhile Spencer Shrader matched a franchise record with five field goals, which accounts for fifteen of the twenty-two points Indianapolis managed all night. Evan’s kicker outscored most of Evan’s actual football players and collected the kicker crown on the way past.',
      },
      { type: 'heading', text: 'RAVENS 30, FALCONS 23 (OT) — Chenell Bought The Understudy On Wednesday' },
      {
        type: 'paragraph',
        text: 'Lamar Jackson didn’t play. Ankle. He watched the whole thing from the sideline in street clothes, and I stayed at a Holiday Inn Express last night but I’m still not qualified to tell you one thing more than that.',
      },
      {
        type: 'paragraph',
        text: 'What’s funny, and frankly the most instructive thing that happened in this league all week, is what Chenell did about it. Because Chenell owns Lamar Jackson.',
      },
      {
        type: 'paragraph',
        text: 'A normal, emotionally healthy person in that position absorbs the zero, says something philosophical about variance, and plays the week with a hole in the middle of the lineup. Chenell went to the waiver wire on Wednesday and bought the man standing directly behind him, with the brisk and faintly unsettling efficiency of a woman replacing a dead houseplant twenty minutes before guests arrive.',
      },
      {
        type: 'paragraph',
        text: 'Tyler Huntley went 24 of 32 for 201 yards and two touchdowns. He threw the tying score to Devontez Walker with forty seconds left in regulation, Derrick Henry — also Chenell’s, because obviously — took the direct snap for the conversion that forced overtime, and then Huntley went and walked in the winner himself.',
      },
      {
        type: 'paragraph',
        text: 'That’s 28.04 out of the superflex slot from a quarterback who was unemployed on Tuesday, and it’s the best waiver pickup in the history of this league by eight full points.',
      },
      {
        type: 'paragraph',
        text: 'Isaiah Likely added 26.9 and the tight end crown out of New York, which is another record. She started the best lineup her roster permitted with nothing left behind anywhere on it — that’s The Mastermind — and she assembled the whole thing in a week when her starting quarterback was standing on a sideline in a tracksuit.',
      },
      { type: 'heading', text: 'VIKINGS 23, SAINTS 13 — Colin Was Rewarded With Ninety-Six Yards And Two Interceptions' },
      {
        type: 'paragraph',
        text: 'Minnesota beat New Orleans 23 to 13 in a game where the Saints generated 142 yards of total offense, which isn’t really a football game so much as an incident that took place on a field.',
      },
      {
        type: 'paragraph',
        text: 'Tyler Shough completed 16 of 25 for 96 yards and threw two interceptions. The projection said 20.21. The scoreboard said 1.84. That’s the largest gap between expectation and reality any healthy starter has ever produced in this league, and it’s now in my book, in my handwriting, in pen.',
      },
      {
        type: 'paragraph',
        text: 'Colin lost by 3.2. To Chenell. The woman who’d spent her Wednesday shopping.',
      },
      {
        type: 'paragraph',
        text: 'I want to be careful here, because Colin didn’t do anything stupid — he started his quarterback, and starting your quarterback is what quarterbacks are structurally for. But there’s a version of loyalty that’s a virtue and a version that’s simply not having looked recently, and on Sunday the distance between those two was 3.2 points and one waiver claim somebody else thought to make.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'I’m contractually obliged to be organized for one paragraph a week and I resent it every single time. Less than usual today, though, because the top row of this thing is a historical document and I’d quite like it framed.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'All Bark, All Bite', topScore: 191.3, bottom: 'Nobody Knows', bottomScore: 172.8, note: 'highest-scoring game in league history' },
          { top: 'Soft Tissue Issues', topScore: 146.0, bottom: 'Tyler’s Talented Team', bottomScore: 130.5 },
          { top: 'Burrow My Burden', topScore: 134.9, bottom: 'Mr. Anderson', bottomScore: 128.9 },
          { top: 'Da Reigning Champ', topScore: 134.2, bottom: 'Nix Pix a Puka Six', bottomScore: 131.0 },
          { top: 'PKM Playmakers', topScore: 122.1, bottom: 'Bree’s Badass Boys', bottomScore: 95.1 },
          { top: 'Dad Bod', topScore: 113.2, bottom: 'Substation Superstars', bottomScore: 112.7, note: 'narrowest margin ever recorded' },
        ],
      },
      { type: 'heading', text: 'Keshia And Doug Played The Biggest Game In League History And One Of Them Had To Lose It' },
      {
        type: 'paragraph',
        text: '191.3 against 172.8. That’s three hundred and sixty-four points inside a single matchup, clearing the old combined record by eighteen and making every other row on that board look like a warm-up act performed in an empty room.',
      },
      {
        type: 'paragraph',
        text: 'Two people went out on a Sunday and staged the highest-scoring game this league has ever hosted. Because of how any of this works, one of them had to come home with a loss.',
      },
      {
        type: 'paragraph',
        text: 'It was Doug. He scored 172.8 and lost by 18.5, which makes him the highest losing score in league history and therefore the answer to a trivia question nobody’s ever wanted to be the answer to.',
      },
      {
        type: 'paragraph',
        text: 'Jayden Daniels gave him 32.26. Bucky Irving gave him 30.5 against a 13.99 projection, the sort of overperformance that wins an ordinary week outright. He did every single thing the job asks of a man, he’s 1-4, and in five weeks I’ve never been less able to explain something to a room.',
      },
      {
        type: 'paragraph',
        text: 'Keshia was trailing by 56.3 before Sunday had so much as kicked off, which is less a deficit than a diagnosis, and then won by 18.5 with seven starters beating their projections.',
      },
      {
        type: 'paragraph',
        text: 'She took Sweatin’ It Out and Slay Girl Slay, and in the same motion left Jordan Love on the bench for 29.28 and picked up The Understudy. That’s impressive multitasking when two of those are compliments and one’s an accusation.',
      },
      {
        type: 'paragraph',
        text: 'Three trophies, a league-record shootout, and a 2-3 record to show for it. I’m merely the man who has to write it down.',
      },
      { type: 'heading', text: 'Jay Is Alone In First Place And I Would Like To Formally Object' },
      {
        type: 'paragraph',
        text: 'Jay beat Justin by 0.58 points. Fifty-eight hundredths of a point. That’s the narrowest margin ever recorded in this league, which means it’s simultaneously the narrowest defeat ever recorded in this league, so Justin owns that entry permanently. It’s the sort of thing that comes up at weddings.',
      },
      {
        type: 'paragraph',
        text: 'Jay won the game with 113.24, the lowest winning score ever recorded here, and he managed it while leaving 35.4 points sitting untouched on his bench. That took The Bench Bum.',
      },
      {
        type: 'paragraph',
        text: 'So let’s total the week up for the man currently leading this league. Worst winning score in recorded history. Smallest margin in recorded history. Largest pile of unused points on the board. First place.',
      },
      {
        type: 'paragraph',
        text: 'Four and one. He had Jahmyr Gibbs for 35.2 and the running back crown, and he also started CeeDee Lamb for 1.9 against a 15.48 projection, so the afternoon wasn’t smooth for him either. He just kept winning, which I’m beginning to think is a personality trait rather than a result.',
      },
      {
        type: 'paragraph',
        text: 'On Monday morning I wrote that Kyren Williams was the only man standing between Jay and the top of this table, and that he was projected for almost exactly enough. Williams went for 16.6 against a projection of 16.07.',
      },
      {
        type: 'paragraph',
        text: 'He cleared it by half a point and Jay won by half a point. I’ve never in my professional life been so precisely correct about something so profoundly stupid, and I’d like that on the record before we arrive at the portion of the broadcast where I’m wrong four separate times.',
      },
      { type: 'heading', text: 'James Read The Last Report, Which Is More Than I Can Say For Most Of You' },
      {
        type: 'paragraph',
        text: 'Last week I pointed out, at some length and with real enthusiasm, that Jameis Winston had put up 26.0 on James’s bench while his starting quarterback managed 15.1, and that swapping those two men alone would have flipped the result. I said it to be cruel. I didn’t expect it to be actionable.',
      },
      {
        type: 'paragraph',
        text: 'This week Winston started, scored 31.74 against a 17.14 projection, and James beat Tyler 146.0 to 130.5 to climb to 3-2. Somebody in this league reads the findings and then goes and acts on them, and I intend to be completely insufferable about it for the rest of the season.',
      },
      {
        type: 'paragraph',
        text: 'Tyler’s now scored 770.6 points this year. That’s eighty-six more than anybody else in the league, and it has purchased him a 3-2 record and second place.',
      },
      {
        type: 'paragraph',
        text: 'That’s the second time in this report I’ve had to bring up his bench and we’re only in week 5. The most talented roster in this experiment continues to be driven like a rental car: quickly, carelessly, and with no visible concern for what any of it costs.',
      },
      { type: 'heading', text: 'THE INVOICE' },
      {
        type: 'paragraph',
        text: 'Which brings us to the portion of the broadcast where I pay for my own opinions. This week the bill is substantial.',
      },
      {
        type: 'paragraph',
        text: 'In week 1 I said Tyler’s 153.3 would finish the season as the highest losing score anybody posts. Doug cleared it by 19.5 on Sunday, so that one’s gone.',
      },
      {
        type: 'paragraph',
        text: 'In week 3 I said the 2-1 logjam would be gone by week 5 and that Tyler would be standing alone at the top of it. The logjam didn’t clear, it grew — six of you are 3-2 — and the man alone at the top is Jay. Wrong in both halves of one sentence, which takes a certain commitment.',
      },
      {
        type: 'paragraph',
        text: 'In week 4 I said Mike wins in week 5 and goes above .500 for the first time all season. He beat Bree 122.1 to 95.1 and he’s 3-2. Correct, and I’d like that one carved into something.',
      },
      {
        type: 'paragraph',
        text: 'And there’s one more, which I’m voiding rather than collecting, because it turns out I have standards. I predicted James would start a different kicker this week, and he did — Cam Little, eight points, perfectly adequate.',
      },
      {
        type: 'paragraph',
        text: 'But Carolina was on bye. Fitzgerald was projected for nothing before a ball had been kicked, so he was leaving that lineup regardless of what he’d done to James the week before. That wasn’t a prediction. That was me reading a calendar out loud in an authoritative voice, and I am not taking the credit for it.',
      },
      { type: 'heading', text: 'The Rest Of The Carnage' },
      {
        type: 'paragraph',
        text: 'Bree scored 95.1, the lowest total anybody posted this week, and lost by 27.0. Both of those come with awards attached that I’m not going to stand here and dwell on, because three weeks ago she was 3-1 and holding a top-three seed.',
      },
      {
        type: 'paragraph',
        text: 'Michael Wilson gave her 5.28 on a 14.02 projection. Sometimes an entire roster declines at the same time and there’s nothing in the methodology to blame for it. This isn’t a trend, it’s a Sunday.',
      },
      {
        type: 'paragraph',
        text: 'Jesse fell five places, fifth to tenth, which is Free Fallin’ and a brutal way to spend seven days. He got 29.3 and the receiver crown out of Christian Watson against an 11.53 projection and still lost by 6.0, because Tyson Bagent handed him 3.2 on an 18.9 projection and Chase Brown handed him 5.5 on a 15.3.',
      },
      {
        type: 'paragraph',
        text: 'In week 1 I called this the most dangerous roster in the league. It’s currently tenth. I’m carrying that prediction into week 6 the way a man carries a houseplant he’s already killed.',
      },
      {
        type: 'paragraph',
        text: 'Evan’s the one who beat him, with 134.9, and sits at 2-3. In week 4 I predicted he’d score 130 or more and lose again before the season was out, on the grounds that with Evan this isn’t luck, it’s a genre. He scored 134.9 and won. That prediction’s technically still breathing and it’s already humiliating me in public.',
      },
      { type: 'heading', text: 'FINDINGS' },
      {
        type: 'paragraph',
        text: 'So here’s where the experiment stands. Twelve records fell in a single afternoon: the best player performance, the biggest overshoot, the biggest shortfall, the highest combined score, the highest losing score, the lowest winning score, the narrowest win, the narrowest defeat, the best waiver pickup, and three position crowns.',
      },
      {
        type: 'paragraph',
        text: 'Five weeks into a season that’s supposed to be settling down, my record book is mostly crossings-out and marginalia. I’m going to have to buy a second one, which I resent more than any individual result in it.',
      },
      {
        type: 'paragraph',
        text: 'Three calls for week 6, and I’ve read the bye schedule first this time, because a scientist is permitted to make a given error precisely once.',
      },
      {
        type: 'paragraph',
        text: 'Colin starts a different quarterback. New Orleans is playing this week — I checked with my own eyes before typing it, which isn’t something I ever expected to be proud of.',
      },
      {
        type: 'paragraph',
        text: 'Tyler finishes this regular season with more points than anybody in the league and doesn’t finish first, because he has the roster and doesn’t appear to have the stomach that goes with it.',
      },
      {
        type: 'paragraph',
        text: 'And Keshia’s 191.3 stands as the highest score anybody posts all year. I made that exact claim in week 1 about a different number, which Doug then drove over on Sunday in front of everybody, so by all means write it down and bring it back to me in January.',
      },
      {
        type: 'paragraph',
        text: 'The laboratory is closed. Go away and be better at this.',
      },
    ],
  },
  {
    slug: 'week-5-one-running-back-holds-the-table',
    series: 'miracles',
    week: 5,
    title: 'One Running Back Is Holding Up The Entire Table',
    summary:
      'Jay trails Justin by sixteen and has one man left: Kyren Williams, projected for exactly enough. If he gets there, Jay is alone at 4-1. If not, as many as eight of you are 3-2. Doug has the week’s high score and needs Matthew Stafford held under 13.8 to keep it worth anything.',
    publishedAt: '2026-10-12',
    published: true,
    coverImage: '/recaps/week-5-miracles.jpg',
    coverAlt:
      'A lone football player silhouetted at the mouth of a stadium tunnel, waiting to walk out onto an empty floodlit field.',
    author: BURNER,
    predictions: [
      {
        id: 'jay-alone-at-4-1',
        claim: 'Kyren Williams clears the gap. Jay beats Justin and is alone at the top at 4-1.',
        verdict: 'correct',
        resolvedWeek: 5,
        resolution:
          'Williams went for 16.6 against a projection of 16.07. He cleared it by '
          + 'half a point and Jay won by 0.58, the narrowest margin ever recorded '
          + 'in this league.',
      },
      {
        id: 'keshia-beats-doug',
        claim: 'Keshia wins. Matthew Stafford clears 13.8 and Doug goes to 1-4 with 171.8 on the board.',
        verdict: 'correct',
        resolvedWeek: 5,
        resolution:
          'Stafford went for 33.32, Keshia won by 18.5 and Doug is 1-4. The only '
          + 'thing I missed was his final: 172.8 rather than 171.8, and that one '
          + 'point is the difference between a loss and the highest losing score '
          + 'in league history.',
      },
      {
        id: 'jesse-catches-evan',
        claim: 'Jesse wins. Josh Allen and Dalton Kincaid find the 24.7, and Evan loses a third straight Monday.',
        verdict: 'wrong',
        resolvedWeek: 5,
        resolution:
          'Allen did his half of it, 33.5 worth. Kincaid managed 3.2 on a 6.99 '
          + 'projection, Jesse lost by 6.0, and Evan won his first Monday of the '
          + 'season.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Four of you started this week at 3-1.',
      },
      {
        type: 'paragraph',
        text: 'Tyler’s game is finished and he is on the wrong end of it. Bree trails by 46.6. Colin trails by 54.7. Jay trails by sixteen and has exactly one running back left.',
      },
      {
        type: 'paragraph',
        text: 'So here is the state of the experiment on Monday morning. The top of the table, the bottom of the table and the highest score of the week are all sitting in one stadium in Inglewood, and not one of the people who care can do a thing about any of it.',
      },
      {
        type: 'paragraph',
        text: 'Bills at Rams, 8:15 Eastern on ESPN and ABC, SoFi Stadium. Buffalo is 3-1, Los Angeles is 2-2 and favored by three and a half, and the total is 54.5, which is the sportsbooks’ way of saying they expect a great deal of screaming. Six of you have a player in it. Ten of you have something riding on it.',
      },
      { type: 'heading', text: 'THE BOARD, AS OF THIS MORNING' },
      {
        type: 'paragraph',
        text: 'I am required to be organized for one paragraph and I resent it. Exactly one row on this board is finished.',
      },
      {
        type: 'scoreboard',
        live: true,
        rows: [
          { top: 'Nobody Knows', topScore: 171.8, bottom: 'All Bark, All Bite', bottomScore: 158.0, note: 'Doug has nobody. Keshia has Stafford.' },
          { top: 'Soft Tissue Issues', topScore: 146.0, bottom: 'Tyler’s Talented Team', bottomScore: 130.5, note: 'over — nobody left' },
          { top: 'Da Reigning Champ', topScore: 134.2, bottom: 'Nix Pix a Puka Six', bottomScore: 79.5, note: 'Colin has Puka Nacua and James Cook' },
          { top: 'PKM Playmakers', topScore: 122.1, bottom: 'Bree’s Badass Boys', bottomScore: 75.5, note: 'Bree has Davante Adams' },
          { top: 'Burrow My Burden', topScore: 116.9, bottom: 'Mr. Anderson', bottomScore: 92.2, note: 'Coleman and Higbee vs Allen and Kincaid' },
          { top: 'Substation Superstars', topScore: 112.7, bottom: 'Dad Bod', bottomScore: 96.6, note: 'Justin has nobody. Jay has Kyren Williams.' },
        ],
      },
      { type: 'heading', text: 'THE MIRACLE: Jay Needs Kyren Williams To Hit His Projection. Exactly His Projection.' },
      {
        type: 'paragraph',
        text: 'Substation Superstars 112.7, Dad Bod 96.6. Justin’s roster is finished. Jay has one man left, Kyren Williams, projected 16.1. The gap is sixteen and change. ESPN has run every model it owns and has Jay winning this by one tenth of a point.',
      },
      {
        type: 'paragraph',
        text: 'One tenth. That is not a forecast. That is a coin balanced on its edge wearing a lab coat.',
      },
      {
        type: 'paragraph',
        text: 'Now here is why the whole league should be watching a single running back. Tyler cannot win. Bree needs Davante Adams to score 46.7 on his own. Colin needs 54.8 between two men. If Kyren clears sixteen, Jay is 4-1 and alone at the top of this league. If he does not, as many as eight of you are 3-2, and the standings stop being a table and become a group photo.',
      },
      {
        type: 'paragraph',
        text: 'Last week Kyren put up 31.7 and took the running back crown. Jay needs about half of that. Half. I have seen this man do the whole thing in one game and Jay is asking for a cutting.',
      },
      {
        type: 'paragraph',
        text: 'And Justin. Justin spent three weeks starting the best player in the league and losing. Tonight he gets to sit with a finished roster and watch somebody else’s running back decide whether his second win is real. Justin, welcome to the observation deck. Evan can show you where the bad coffee is. He has been up here two Mondays running.',
      },
      {
        type: 'paragraph',
        text: 'One more thing, for the record. Two weeks ago I said Tyler would be alone at the top of this table by week 5. Tyler trails James 146.0 to 130.5 and neither of them has a player left. If anybody is alone up there on Wednesday, it is Jay, and the only man who can put him there plays for the Rams.',
      },
      { type: 'heading', text: 'THE BAD BEAT IN WAITING: Doug Needs Matthew Stafford Held Under 13.8' },
      {
        type: 'paragraph',
        text: 'Doug has 171.8. It is the highest score in the league this week by a distance. Last week Doug had the lowest. The man has gone from the bottom of the instrument to the top of it in seven days, which in my field is called a calibration error and in his is called Sunday.',
      },
      {
        type: 'paragraph',
        text: 'Doug’s roster is finished. Keshia has 158.0, the second-best score in the league, and one man left: Matthew Stafford, projected 23.5. Doug needs the Rams’ quarterback held under 13.8 points. ESPN has Keshia winning by 9.7.',
      },
      {
        type: 'paragraph',
        text: 'Both of them are 1-3. The two highest-scoring rosters of the week are playing each other, and one of them leaves this building 1-4 having outscored ten other people. That is not a fantasy matchup. That is two people setting the lab on fire and only one of them being allowed out of the building.',
      },
      {
        type: 'paragraph',
        text: 'Here is what Doug is rooting for, because it is strange. He needs the Rams to move the ball without throwing it. He needs Kyren Williams to carry the whole night, which is precisely what Jay needs, so for three hours Doug and Jay are lab partners. Keshia needs the opposite: Stafford to Puka Nacua, Stafford to Davante Adams, every one of them paying her and helping Colin and Bree in a way that has stopped mattering.',
      },
      {
        type: 'paragraph',
        text: 'If Stafford finds 13.8, Doug posts 171.8 and goes 1-4. I want everyone to understand that I will not be letting that go on Tuesday.',
      },
      { type: 'heading', text: 'THE ONE WITH PLAYERS ON BOTH SIDES: Evan Has Somebody Left. Finally.' },
      {
        type: 'paragraph',
        text: 'Burrow My Burden 116.9, Mr. Anderson 92.2. Evan leads by 24.7, and for the first Monday in three he is not merely a spectator at his own experiment. He has Keon Coleman, projected 7.3, and Tyler Higbee, projected 2.7. Jesse has Josh Allen, projected 23.3, and Dalton Kincaid, projected 7.0.',
      },
      {
        type: 'paragraph',
        text: 'Run the arithmetic and the projections leave Evan ahead by 4.4. That is one Josh Allen rushing touchdown. That is one Josh Allen afternoon jog.',
      },
      {
        type: 'paragraph',
        text: 'And Buffalo is short at receiver. Joshua Palmer is out with a shoulder, DJ Moore is questionable after missing Thursday and Friday, and rookie Skyler Bell is active because there is nobody else to activate. That should mean more targets for Keon Coleman, who belongs to Evan. Every one of them is thrown by Josh Allen, who belongs to Jesse. Evan’s best hope tonight is a supply line that runs straight through the enemy’s warehouse.',
      },
      {
        type: 'paragraph',
        text: 'Jesse started this season as the roster I called the most dangerous in the league. He is 2-2. A win puts him back at .500 and drags one more name into the 3-2 pileup. A loss and Jesse is 2-3 and I owe that column an apology.',
      },
      {
        type: 'paragraph',
        text: 'There is also a debt of mine riding on this. I said last Tuesday that Evan would score 130 and lose again before the season is out. Coleman and Higbee need 13.1 between them to get him there. If they find it and Allen finds more, I collect early, and Evan collects nothing at all.',
      },
      { type: 'heading', text: 'THE FORMALITIES' },
      {
        type: 'paragraph',
        text: 'James leads Tyler 146.0 to 130.5 and both rosters are empty. Last week James lost to two kickers. This week he is beating the man I had penciled in at the top of the league, and I would like to formally hand that prediction to the coroner.',
      },
      {
        type: 'paragraph',
        text: 'Mike leads Bree 122.1 to 75.5. Bree needs 46.7 from Davante Adams, projected 13.3. Last Tuesday I said Mike wins in week 5 and climbs above .500 for the first time all year. Davante Adams is the last thing standing between me and that receipt, and he needs the game of his life to stop it.',
      },
      {
        type: 'paragraph',
        text: 'Chenell leads Colin 134.2 to 79.5. Colin has Puka Nacua, off the injury report and coming off nine catches for 125 yards in his return last week, and James Cook. He needs 54.8 from the pair. Colin’s team is called Nix Pix a Puka Six. Tonight he needs roughly nine of them.',
      },
      { type: 'heading', text: 'WHAT I THINK HAPPENS' },
      {
        type: 'paragraph',
        text: 'On the record, to be read back to me in about thirty hours:',
      },
      {
        type: 'paragraph',
        text: 'Kyren Williams clears sixteen. Jay beats Justin and is alone at 4-1, and the group photo never gets taken.',
      },
      {
        type: 'paragraph',
        text: 'Keshia wins. Stafford finds 13.8 before the fourth quarter, and Doug goes 1-4 holding 171.8 points, which is a sentence I have been waiting all morning to write in the future tense.',
      },
      {
        type: 'paragraph',
        text: 'And Jesse catches Evan. I am going against the model on this one. Josh Allen in a game with a total of 54.5 does not stop at 23, and Evan spends a third straight Monday night learning that having players left is not the same as having enough.',
      },
      {
        type: 'paragraph',
        text: 'Kickoff is 8:15. Doug and Jay, root for the run. Keshia, root for the pass. Evan and Jesse, you both need Josh Allen tonight for completely opposite reasons, so I would recommend separate rooms.',
      },
    ],
  },
  {
    slug: 'week-4-two-kickers-one-game',
    series: 'recap',
    week: 4,
    title: 'James Lost To Two Kickers In The Same Football Game',
    summary:
      'Ryan Fitzgerald missed two extra points. Jake Bates made everything he looked at. James lost by 8.7 to the man on the other side of the field, then found out the trade that looked like the culprit had actually kept it close. Bree put up 162.4, Tyler came back from 90 down, and Mike owned the best quarterback and the best receiver in football for one afternoon.',
    publishedAt: '2026-10-06',
    published: true,
    coverImage: '/recaps/week-4.jpg',
    coverAlt:
      'A placekicker silhouetted at the end of his follow-through as the ball sails wide of an upright under floodlights.',
    author: BURNER,
    predictions: [
      {
        id: 'james-new-kicker',
        claim: 'James is starting a different kicker in week 5. Ryan Fitzgerald does not survive the week.',
        // ⚠️ NOT A PREDICTION, and it would have scored as a hit. Carolina was
        // on bye in week 5: Fitzgerald carried a 0.00 projection before a ball
        // was kicked, down from 8.35 the week before, so he was coming out of
        // that lineup whether or not he had missed two extra points. The
        // schedule had already decided it.
        verdict: 'void',
        resolvedWeek: 5,
        resolution:
          'Void, and not because it was wrong. Carolina was on bye in week 5. '
          + 'Fitzgerald was projected 0.00 before a ball was kicked, so he was '
          + 'leaving that lineup whatever his extra points had done. I wrote '
          + 'down a certainty and presented it as a call. The instrument was '
          + 'reading the calendar.',
      },
      {
        id: 'mike-above-500',
        claim: 'Mike wins in week 5 and is above .500 for the first time all season.',
        verdict: 'correct',
        resolvedWeek: 5,
        resolution:
          'Mike beat Bree 122.1 to 95.1 behind a 47.46 from Drake Maye, and is 3-2.',
      },
      {
        id: 'evan-bad-beat-again',
        claim: 'Evan scores 130 or more and loses again before the season is out.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. This week a fantasy matchup was decided by two kickers standing on opposite sidelines of the same football game.',
      },
      {
        type: 'paragraph',
        text: 'One of them made everything. The other one missed two extra points. James owned the wrong one.',
      },
      {
        type: 'paragraph',
        text: 'The kicker gap was 10.0. The margin was 8.7. I have run the numbers through the centrifuge three times and they keep coming out the same shape, which is the shape of a man staring at a ceiling at one in the morning.',
      },
      { type: 'heading', text: 'PANTHERS 32, LIONS 26 — The Sunday Night Ledger' },
      {
        type: 'paragraph',
        text: 'Three managers in this league had a stake in Sunday Night Football, and every one of them got a different movie.',
      },
      {
        type: 'paragraph',
        text: 'Mike got Tetairoa McMillan: 14 catches, 192 yards, two touchdowns, 38.2 fantasy points against a 13.5 projection. The best player in the league this week and The Prime Specimen, The One Man Army and Fantasy Nostradamus all at once, which is three awards for one receiver and the most decorated afternoon any human has had in this building.',
      },
      {
        type: 'paragraph',
        text: 'James got Ryan Fitzgerald, who lined up for the extra point after McMillan’s first touchdown and missed it, then lined up for the extra point after McMillan’s second touchdown and missed that too. In this league a missed extra point is not a zero. It is a minus one. So every time Mike’s receiver scored, James’s kicker walked out and took a point off James’s total.',
      },
      {
        type: 'paragraph',
        text: 'And Justin got Jake Bates. Four field goals from 54, 43, 41 and 26 yards, both extra points, nothing missed, 16.0 points. That is more than Trevor Lawrence scored for James. It is more than Christian McCaffrey scored for James. It is nearly four times what Ja’Marr Chase scored for James. A kicker on the losing team outscored James’s quarterback, his running back and his best receiver, from forty yards behind the play.',
      },
      {
        type: 'paragraph',
        text: 'Then there was the fourth quarter. With 8:59 left Carolina faced fourth-and-4 at the Detroit 37, which is about a 54-yard field goal, and a field goal of fifty-plus pays five points in this league. Carolina had watched its kicker all evening. Carolina went for it. They converted, and James received nothing for the trouble.',
      },
      {
        type: 'paragraph',
        text: 'Which brings us to 3:38 left, with Justin ahead by four tenths of a point and Detroit driving. Goff found Sam LaPorta in the seam from eight yards out, which is 7.3 points for a tight end in this league, and Bates added the extra point. Justin’s lead went from 0.4 to 8.7 on one snap and one kick, and those are the final numbers.',
      },
      {
        type: 'paragraph',
        text: 'For the NFL that touchdown pulled Detroit within six. For James it was the end. Detroit got the ball back, failed on fourth-and-13 with two minutes left, and Carolina knelt it out while James did the arithmetic on two missed extra points. Fitzgerald made both his field goals and finished with 6.0. Bates finished with 16.0.',
      },
      { type: 'heading', text: 'CHIEFS 30, RAIDERS 27 — Bree Had Both Halves Of The Box Score' },
      {
        type: 'paragraph',
        text: 'Kansas City is 4-0 and Las Vegas has its first loss, and Bree finished the afternoon having been right twice. Kenneth Walker III ran for 175 yards and two scores, including a 76-yarder, worth 30.4 points. Kirk Cousins, on the other side, put up 27.6. Bree had the running back who beat the Raiders and the quarterback who lost to him, and she collected on both. That is not picking a side. That is owning the casino.',
      },
      {
        type: 'paragraph',
        text: 'And Cousins threw a touchdown pass to Brock Bowers, who as of this week belongs to James. Hold that thought.',
      },
      { type: 'heading', text: 'COWBOYS 34, TEXANS 30 — Seventeen Catches' },
      {
        type: 'paragraph',
        text: 'CeeDee Lamb caught 17 passes for 189 yards and a touchdown on 21 targets, the last of them the go-ahead score with 43 seconds left, and Jay’s 32.8 from him was the third-best performance in the league. Chenell got 28.8 from Javonte Williams in the same game and lost anyway, which is the theme of Chenell’s week. Bree’s C.J. Stroud threw for 347 and two scores on the losing side, and Colin’s Nico Collins, back off IR, put up 27.3 for Houston. Four managers, one shootout, and the only one who lost was the one who had a Cowboy.',
      },
      { type: 'heading', text: 'PATRIOTS 29, BILLS 26 — The Other Half Of Mike’s Day' },
      {
        type: 'paragraph',
        text: 'New England upset Buffalo and Drake Maye put up 33.2 for Mike, the best quarterback score in the league. Add McMillan and Mike owned the QB King and the WR King in the same week. Two weeks ago this man scored 55.4 and I told you it was a floor. I would like the laboratory to note that the floor now has two crowns on it.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'Everything is final. I can say that this week, and you have no idea how good it feels.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Bree’s Badass Boys', topScore: 162.4, bottom: 'Mr. Anderson', bottomScore: 111.8, note: 'week high' },
          { top: 'Nix Pix a Puka Six', topScore: 157.5, bottom: 'Nobody Knows', bottomScore: 99.5 },
          { top: 'Dad Bod', topScore: 155.1, bottom: 'Da Reigning Champ', bottomScore: 126.1 },
          { top: 'PKM Playmakers', topScore: 141.6, bottom: 'All Bark, All Bite', bottomScore: 103.0 },
          { top: 'Tyler’s Talented Team', topScore: 141.2, bottom: 'Burrow My Burden', bottomScore: 130.9 },
          { top: 'Substation Superstars', topScore: 121.1, bottom: 'Soft Tissue Issues', bottomScore: 112.4, note: 'decided on Sunday night' },
        ],
      },
      { type: 'heading', text: 'The Trade Looks Like The Culprit. It Was The Only Thing Keeping It Close.' },
      {
        type: 'paragraph',
        text: 'There is a wrinkle, and it is the first place anybody would look. Midweek James sent Rome Odunze and Colston Loveland to Justin for Brock Bowers. Then he lost to Justin. Odunze started for Justin and scored 12.4. So the natural theory, the one any of us would have at one in the morning, is that James traded away the margin.',
      },
      {
        type: 'paragraph',
        text: 'I tested it. Bowers scored 17.6 for James, touchdown from Bree’s quarterback included. Undo the trade and James’s tight end is Loveland, who scored 8.7 on Justin’s bench. Give James the most generous version possible and let him start Odunze over Dontayvion Wicks too. He finishes with about 112.6, essentially what he scored. Meanwhile Justin gets Bowers back in place of Odunze, which is worth 5.2 more. Without the trade, James loses by roughly 13.7.',
      },
      {
        type: 'paragraph',
        text: 'The trade did not lose James this game. The trade is the reason it was close enough to hurt. The hypothesis was sound. The specimen simply did not do it.',
      },
      {
        type: 'paragraph',
        text: 'And here is the part I enjoy. Last week Justin benched Brock Bowers while he scored 22.6, started Mark Andrews for 3.9 instead, and then traded Bowers away. This week Justin won with the lowest winning score of the week, The Cat Burglar, and the closest game of the week, The Photo Finish, and his tight end won the TE crown. It was not Bowers. It was LaPorta. Justin did not need to be right about Bowers. He only needed to be right about which kicker to own.',
      },
      {
        type: 'paragraph',
        text: 'If James wants to know where the 8.7 actually went, it is on his bench, and I say this gently, because the Sunday morning numbers backed him. Jameis Winston scored 26.0 there against Lawrence’s 15.1. Tyler Allgeier scored 11.9 there against Wicks’s 3.3. Swap Allgeier in alone and James loses by 0.1. Swap Winston in alone and he wins. Both calls followed the projections and both were reasonable, which is the cruelest sentence I can write about either of them.',
      },
      { type: 'heading', text: 'Tyler Was Down 90.4 And Never Looked Worried' },
      {
        type: 'paragraph',
        text: 'Monday I said Tyler wins, and he did. Bijan Robinson put up 27.2 on his own, nearly the whole 29.1 Tyler needed, and Tyler beat Evan 141.2 to 130.9. During Sunday afternoon Tyler trailed by 90.4, which earned him Sweatin’ It Out. He also left Aaron Rodgers on his bench for 30.0, which earned him The Understudy, and he won anyway. That is the most expensive comfortable win I have recorded in this laboratory.',
      },
      {
        type: 'paragraph',
        text: 'Evan, meanwhile, is now the most consistent man in science. The Bad Beat for scoring 130.9 and losing. The Bench Bum for leaving 22.8 behind, with Cam Ward, Carnell Tate and Jalon Daniels all over fifteen on the shelf. And The Control Group, for finishing 1.8 from his projection. He did exactly what the model said he would, and the model said he would lose. Two Mondays running he has sat with a finished roster and watched someone else’s players decide his week. This time he lost by 10.3.',
      },
      { type: 'heading', text: 'Bree Put Up 162.4 And Took My Prediction With It' },
      {
        type: 'paragraph',
        text: 'Slay Girl Slay: seven of Bree’s starters beat their projection. Then on Monday night Alvin Kamara put up 20.3 on a 9.2 projection, the week’s top score went to Bree, and I owe her an apology.',
      },
      {
        type: 'paragraph',
        text: 'I said on Monday that Colin would finish with the week’s top score. Tyler Shough did exactly what I asked: 17.9, more than the 15.6 Colin needed to pass Jay. Colin got to 157.5, won The Mastermind for finishing 1.9 off his best possible lineup, and still came second, because I wrote off Bree as “less likely.” Bree beat Jesse by 50.5 and moved to 3-1. I wrote her off. That is the second time this season she has made me mark my own paper down, and I am starting to suspect she reads this.',
      },
      { type: 'heading', text: 'The Rest Of The Lab' },
      {
        type: 'paragraph',
        text: 'Jay beat Chenell 155.1 to 126.1 behind Kyren Williams’ 31.7, the RB crown, and won The Waiver Wire Wizard for Ollie Gordon II’s 17.0. Ollie Gordon scored that 17.0 on Jay’s bench. The award is for picking him up, which Jay did beautifully. Starting him was a separate exam. Chenell slides from third to sixth, Free Fallin’, with Kyle Monangai’s 27.5 sitting on her bench, the second-biggest bench score in the league.',
      },
      {
        type: 'paragraph',
        text: 'Keshia lost to Mike 141.6 to 103.0 and won The Socialist, with only 16.6 between her best starter and her worst. Total equality, achieved by having nobody break out. Saquon Barkley gave her 1.5 on a 13.4 projection, and Will Reichard won the kicker crown with 17.0 for her, which this week makes Keshia an authority on kickers and James a cautionary tale.',
      },
      {
        type: 'paragraph',
        text: 'Doug had the lowest score in the league at 99.5, The Dumpster Fire, lost by 58.0 for The Public Execution, and made nine roster moves for The Galaxy Brain. His week started with two quarterbacks going to IR, which is not material and I will not make it material. What I will say is that nine moves is not forty, and I am watching.',
      },
      {
        type: 'paragraph',
        text: 'Jesse lost by 50.5 and is 2-2. His Chris Olave did his job, 15.6 on Monday against a 15.1 projection. It was just never going to be enough.',
      },
      { type: 'heading', text: 'THE FINDINGS' },
      {
        type: 'paragraph',
        text: 'Four of you are 3-1: Tyler, Jay, Bree and Colin. Four are 2-2. Four are 1-3, and one of them, Justin, finally has a win to show for having the best player in the league.',
      },
      {
        type: 'paragraph',
        text: 'The ledger. Justin wins in week 4: correct, and I am going to be insufferable about it. Tyler beats Evan: correct. Doug posts the week’s lowest score: correct, though I take no pleasure in that one. Colin takes the top score: wrong, Bree, see above. Jesse leaves twenty on the bench and wins anyway: wrong, he lost both weeks it had to happen in, and that call is dead. Tyler alone at the top by week 5: still alive, sharing first with three people and one week left. Mike not finishing last: aging beautifully.',
      },
      {
        type: 'paragraph',
        text: 'Three new ones, said with the confidence of a man who went three for five this week and is choosing to round up.',
      },
      {
        type: 'paragraph',
        text: 'James starts a different kicker in week 5. Ryan Fitzgerald does not survive the week. Mike wins in week 5 and goes above .500 for the first time all year. And Evan scores 130 again and loses again before this is over, because with Evan that is not bad luck, it is a pattern.',
      },
      {
        type: 'paragraph',
        text: 'Week five begins Thursday. Make your extra points.',
      },
    ],
  },
  {
    slug: 'week-4-evan-has-nobody-left-again',
    series: 'miracles',
    week: 4,
    title: 'Evan Has Nobody Left. Again.',
    summary:
      'For the second Monday running, Evan leads with an empty roster and a stranger holds the matches. He is up 29.0 on Tyler, and Tyler has Bijan Robinson and Drake London in New Orleans tonight. Everything still alive in this league is in one dome.',
    publishedAt: '2026-10-05',
    published: true,
    coverImage: '/recaps/week-4-miracles.jpg',
    coverAlt:
      'A lone figure silhouetted in empty stadium seats under floodlights, head bowed, waiting.',
    author: BURNER,
    predictions: [
      {
        id: 'tyler-catches-evan',
        claim: 'Tyler wins. Bijan Robinson and Drake London find the 29.1 points between them.',
        verdict: 'correct',
        resolvedWeek: 4,
        resolution: 'Bijan Robinson scored 27.2 on his own. Tyler won 141.2 to 130.9.',
      },
      {
        id: 'colin-week-high',
        claim: 'Colin finishes with the highest score of week 4. Tyler Shough clears the 15.6 he needs to pass Jay.',
        verdict: 'wrong',
        resolvedWeek: 4,
        resolution: 'Shough scored 17.9 and Colin passed Jay with 157.5, but Kamara put up 20.3 and Bree finished on 162.4.',
      },
      {
        id: 'doug-week-low',
        claim: 'Doug finishes week 4 with the lowest score in the league, Penix or no Penix.',
        verdict: 'correct',
        resolvedWeek: 4,
        resolution: 'Doug finished on 99.5, the lowest score of the week.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. I have seen this experiment before.',
      },
      {
        type: 'paragraph',
        text: 'Last Monday, Evan led by 3.3 with nobody left to play and spent the evening watching another man’s quarterback decide his week. This Monday, Evan leads by 29.0. With nobody left to play. And another man’s running back and wide receiver deciding his week.',
      },
      {
        type: 'paragraph',
        text: 'The lead is nearly nine times bigger. The situation is identical. In science we call that replication, and it is the most exciting word in the discipline. Evan is going to call it something else.',
      },
      {
        type: 'paragraph',
        text: 'Three matchups are still alive. All three are being settled tonight in New Orleans, Falcons at Saints, 8:15 Eastern on ESPN. Both teams are 1-2, the Saints are favored by a point and a half, and five of you have at least one man in that building.',
      },
      { type: 'heading', text: 'THE BOARD, AS OF THIS MORNING' },
      {
        type: 'paragraph',
        text: 'I am obliged to be organized for one moment. Nothing in the bottom three rows is final.',
      },
      {
        type: 'scoreboard',
        live: true,
        rows: [
          { top: 'Dad Bod', topScore: 155.1, bottom: 'Da Reigning Champ', bottomScore: 126.1, note: 'over — nobody left' },
          { top: 'PKM Playmakers', topScore: 141.6, bottom: 'All Bark, All Bite', bottomScore: 103.0, note: 'over — nobody left' },
          { top: 'Substation Superstars', topScore: 121.1, bottom: 'Soft Tissue Issues', bottomScore: 112.4, note: 'over — nobody left' },
          { top: 'Burrow My Burden', topScore: 130.9, bottom: 'Tyler’s Talented Team', bottomScore: 101.9, note: 'Evan has nobody. Tyler has Bijan and Drake London.' },
          { top: 'Bree’s Badass Boys', topScore: 142.1, bottom: 'Mr. Anderson', bottomScore: 96.2, note: 'Kamara vs Olave' },
          { top: 'Nix Pix a Puka Six', topScore: 139.6, bottom: 'Nobody Knows', bottomScore: 75.8, note: 'Shough vs Penix and Juwan Johnson' },
        ],
      },
      { type: 'heading', text: 'THE MIRACLE: Evan Needs Bijan Robinson And Drake London Held Under 29.1, Combined' },
      {
        type: 'paragraph',
        text: 'Burrow My Burden 130.9, Tyler’s Talented Team 101.9. Evan’s roster has finished. Every specimen he owns has been weighed, measured and returned to the freezer. He cannot add a decimal.',
      },
      {
        type: 'paragraph',
        text: 'Tyler has two men left, and they are the two best things the Atlanta Falcons own. Bijan Robinson, projected 19.5. Drake London, projected 13.7. That is 33.2 of projection chasing a 29.0 deficit, which means ESPN currently believes Tyler wins this by about four points, and that Evan’s 130.9 is about to become the most elaborate losing score in the building.',
      },
      {
        type: 'paragraph',
        text: 'Here is what makes it worse. The last time these two men played a football game, on Thursday night against Green Bay, Bijan ran for 194 yards and two touchdowns and Drake London caught nine of ten targets for another 194. That is 407 yards from scrimmage between them in one evening. Tyler needs roughly a third of that.',
      },
      {
        type: 'paragraph',
        text: 'And the Saints are thin in exactly the wrong places for Evan. Kaden Elliss is out. Carl Granderson and Anfernee Jennings are out. Pete Werner is questionable with a shoulder. New Orleans is walking into this game short a starting linebacker and two edge rushers, against a man who just ran for nearly two hundred yards. I am not a defensive coordinator. I do not need to be one to read that.',
      },
      {
        type: 'paragraph',
        text: 'So let us state precisely what Evan is rooting for. He needs the Saints to bottle up a running back coming off 194 rushing yards with half a linebacker room, and he needs Michael Penix Jr. to look at Drake London all night and decide, for reasons of his own, to throw it somewhere else. Twenty-nine points. That is the ceiling on two players who cleared it comfortably last time they took the field.',
      },
      {
        type: 'paragraph',
        text: 'Evan, the laboratory notes that you have now built a lead and then handed the stopwatch to someone else in consecutive weeks. That is not bad luck. That is a methodology. You are the only man in this league who finishes his Sunday early and then has to watch a Monday he has no players in like it is a hostage video.',
      },
      {
        type: 'paragraph',
        text: 'And Tyler, I would remind you, is the man I said would be alone at the top of this table by week 5. That prediction lives or dies in this game. I have a personal interest and I am declaring it.',
      },
      { type: 'heading', text: 'THE DUET: Doug Needs His Tight End To Score Off Colin’s Quarterback' },
      {
        type: 'paragraph',
        text: 'Colin leads Doug 139.6 to 75.8. That is a gap of almost sixty-four points, and I would normally file it under formalities, except for the shape of what is left.',
      },
      {
        type: 'paragraph',
        text: 'Colin has Tyler Shough, projected 23.1, who is third in the NFL in passing yards and passing touchdowns through three games and threw four of them last week. Doug has Michael Penix Jr., projected 17.9, the man throwing to Tyler’s guys. And Doug has Juwan Johnson, projected 8.6.',
      },
      {
        type: 'paragraph',
        text: 'Juwan Johnson is a New Orleans Saint. Juwan Johnson catches passes from Tyler Shough.',
      },
      {
        type: 'paragraph',
        text: 'Sit with that. Every time Doug’s tight end catches the ball, Colin’s quarterback gets paid for throwing it. Doug’s offense tonight is, in part, a subsidy program for the man beating him. He cannot root for his own player without also rooting for his opponent. This is the fantasy football equivalent of a man paying his own ransom.',
      },
      {
        type: 'paragraph',
        text: 'Doug needs Penix and Johnson to outscore Shough by about sixty-four. With Noah Fant questionable, Johnson may see more of the ball than usual, and that is the most hope I can responsibly offer, and it comes with Shough attached.',
      },
      { type: 'heading', text: 'THE SIDE BET: Colin Is Chasing The Week’s Top Score' },
      {
        type: 'paragraph',
        text: 'Here is the subplot nobody is watching. The highest score of the week right now is Jay’s 155.1. Colin sits at 139.6 with Shough still to come. He needs 15.6 from a quarterback projected for 23.1.',
      },
      {
        type: 'paragraph',
        text: 'Bree is the other contender. She is at 142.1 and needs 13.1 from Alvin Kamara, projected 9.2, who is about to carry the Saints backfield with Travis Etienne on injured reserve. Less likely. Not impossible. Kamara has never needed an invitation to a workload.',
      },
      { type: 'heading', text: 'THE LONG SHOT: Jesse Needs Chris Olave To Do Something Historically Interesting' },
      {
        type: 'paragraph',
        text: 'Bree leads Jesse 142.1 to 96.2. Jesse has Chris Olave, projected 15.1. Bree has Kamara, projected 9.2. Jesse needs Olave to outscore Kamara by forty-six points, which is not a stat line, it is a career. A loss puts the man I once called the most dangerous roster in the league at 2-2, and I am going to need a moment with that column.',
      },
      { type: 'heading', text: 'THE FORMALITIES' },
      {
        type: 'paragraph',
        text: 'Justin leads James 121.1 to 112.4 and both rosters are empty, so it is over in everything but the database. Last Tuesday I wrote that Justin wins a game in week 4 because a team that starts the best player in the league and goes 0-3 is not bad, it is haunted. The exorcism is scheduled for when ESPN closes the week, and I will be collecting on it.',
      },
      {
        type: 'paragraph',
        text: 'Jay has put 155.1 on Chenell’s 126.1, the highest score of the week so far. Mike has 141.6 against Keshia’s 103.0, and Mike, who walked into this week with the fewest points in the league by nearly fifty, is sitting on the third-highest score of the week. I said the 55.4 was a floor. I am saying it louder now.',
      },
      { type: 'heading', text: 'WHAT I THINK HAPPENS' },
      {
        type: 'paragraph',
        text: 'On the record, to be quoted back at me in roughly thirty hours:',
      },
      {
        type: 'paragraph',
        text: 'Tyler wins. Bijan and London find twenty-nine points between them before the fourth quarter starts, and Evan spends a second consecutive Monday night as a spectator at his own experiment.',
      },
      {
        type: 'paragraph',
        text: 'Colin takes the week’s top score. Shough clears 15.6 and passes Jay, and some of it comes on throws to Juwan Johnson, which Doug will have to watch.',
      },
      {
        type: 'paragraph',
        text: 'And Doug finishes with the lowest score of the week. Penix may have a lovely night. It will not be lovely enough.',
      },
      {
        type: 'paragraph',
        text: 'Kickoff is 8:15. Evan, put the phone in another room. It will not help, but the readings will be cleaner.',
      },
    ],
  },
  {
    slug: 'week-3-a-backup-rearranged-your-league',
    series: 'recap',
    week: 3,
    title: 'A Thirty-Eight-Year-Old Backup Rearranged Your Entire League',
    summary:
      'Case Keenum decided three matchups from the bench of a manager who did not start him. Jesse needed a defense to save him and got a zero. Seven of you are now 2-1, which is the least useful thing a table has ever told me.',
    publishedAt: '2026-09-29',
    published: true,
    coverImage: '/recaps/week-3.jpg',
    coverAlt:
      'A packed line of football players silhouetted shoulder to shoulder under stadium floodlights.',
    author: BURNER,
    predictions: [
      {
        id: 'seven-way-tie-breaks',
        claim:
          'The 2-1 logjam is gone by week 5 and Tyler is alone at the top of it.',
        verdict: 'wrong',
        resolvedWeek: 5,
        resolution:
          'The logjam grew rather than cleared \u2014 six teams are 3-2 after week 5 '
          + '\u2014 and the man alone at the top is Jay, not Tyler. Wrong in both '
          + 'halves of one sentence.',
      },
      {
        id: 'justin-wins-one',
        claim: 'Justin wins a game in week 4. He is too good to be 0-4.',
        verdict: 'correct',
        resolvedWeek: 4,
        resolution: 'Justin beat James 121.1 to 112.4, decided by a LaPorta touchdown and a Jake Bates extra point.',
      },
      {
        id: 'doug-fiddles-again',
        claim:
          'Doug makes another forty-plus roster moves in a single week before the season ends.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. I went three for three on Monday morning and I would like everybody to sit with that for a moment.',
      },
      {
        type: 'paragraph',
        text: 'I said Bree would beat Evan. Bree beat Evan. I said Keshia would take down the league leader. Keshia took down the league leader. I said James would hold on by less than a touchdown, and James held on by four point eight, which is less than a touchdown by one and a bit points.',
      },
      {
        type: 'paragraph',
        text: 'Twenty-four hours of perfect forecasting. A flawless instrument. And in the very same post I had to shoot my own week 1 prediction in the head, because calling James to win meant calling Chenell to lose, and I had spent a fortnight telling all of you that Chenell does not lose in September.',
      },
      { type: 'paragraph', text: 'Chenell lost in September. On the twenty-eighth. With two days left in it.' },
      {
        type: 'paragraph',
        text: 'The science is strong. The scientist is an idiot. Let us proceed.',
      },
      { type: 'heading', text: 'BEARS 27, EAGLES 7 — The Third-Stringer Did This To Four Of You' },
      {
        type: 'paragraph',
        text: 'Caleb Williams was out with a hamstring. Tyson Bagent had been concussed the week before. So Chicago started Case Keenum, aged thirty-eight, third on the depth chart, a man whose presence in a Monday night game is normally a sign that something has gone badly wrong — and Chicago beat the undefeated Philadelphia Eagles 27–10 on the ground and 27–7 on the scoreboard.',
      },
      {
        type: 'paragraph',
        text: 'Jalen Hurts threw a pick in the third that ended the argument. Saquon Barkley started hot and disappeared. Philadelphia never found a rhythm and did not deserve to.',
      },
      {
        type: 'paragraph',
        text: 'In this laboratory, that one football game settled three matchups, decided who spent the night celebrating, and made an absolute mockery of the word “projection”. It is the most consequential ninety minutes this league has had all season and none of you could do a thing about it.',
      },
      { type: 'heading', text: '49ERS 36, CARDINALS 30 — The Best Player In The League Belongs To The Worst Team In It' },
      {
        type: 'paragraph',
        text: 'Brock Purdy went 15 of 27 for 297 and four touchdowns, added 34 yards on the ground, and kept San Francisco undefeated and alone at the top of the NFC West. He scored 39.3 fantasy points, the highest single-player figure anybody in this league has recorded this week.',
      },
      {
        type: 'paragraph',
        text: 'He plays for Justin. Justin is 0-3.',
      },
      {
        type: 'paragraph',
        text: 'I want to be careful here, because Justin is having a genuinely wretched season and a man in a hole should be handed a ladder rather than a shovel. But the arithmetic is the arithmetic: Substation Superstars started the best player in the competition and lost by 72.6.',
      },
      { type: 'heading', text: 'COMMANDERS 33, SEAHAWKS 31 — Sam Darnold Threw For 379 From Tyler’s Bench' },
      {
        type: 'paragraph',
        text: 'Three weeks ago I wrote up the cruellest line on the page: Tyler started Sam Darnold in the superflex, Darnold lasted five snaps before a hip injury ended his afternoon, and Tyler received half a point and lost by 12.7.',
      },
      {
        type: 'paragraph',
        text: 'On Sunday, Sam Darnold completed 31 of 45 for 379 yards and threw four scores.',
      },
      { type: 'paragraph', text: 'Tyler had him on the bench.' },
      {
        type: 'paragraph',
        text: 'Thirty-seven point seven, in street clothes, for the manager who started him on the one afternoon he got hurt in the first quarter. There is a word for a relationship with that shape and it is not a word I am allowed to use in a family newsletter.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'Bookkeeping, then the interesting part.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Tyler’s Talented Team', topScore: 178.8, bottom: 'Substation Superstars', bottomScore: 106.2 },
          { top: 'Nix Pix a Puka Six', topScore: 143.3, bottom: 'PKM Playmakers', bottomScore: 92.3 },
          { top: 'Dad Bod', topScore: 136.5, bottom: 'Nobody Knows', bottomScore: 101.7 },
          { top: 'All Bark, All Bite', topScore: 127.2, bottom: 'Mr. Anderson', bottomScore: 105.5 },
          { top: 'Bree’s Badass Boys', topScore: 125.4, bottom: 'Burrow My Burden', bottomScore: 115.1 },
          { top: 'Soft Tissue Issues', topScore: 121.8, bottom: 'Da Reigning Champ', bottomScore: 117.0 },
        ],
      },
      { type: 'heading', text: 'Bree Won A Game She Was Losing By Sixty-Four Points' },
      {
        type: 'paragraph',
        text: 'At some point on Sunday afternoon, Bree’s Badass Boys trailed Burrow My Burden by 64.7 points. Sixty-four point seven. That is not a deficit you come back from, that is a deficit you concede and go outside and look at a tree.',
      },
      { type: 'paragraph', text: 'Final: 125.4 to 115.1.' },
      {
        type: 'paragraph',
        text: 'That is the largest comeback in the short history of this league by a distance — Chenell’s 46.7 in week 1 was the record and is now a footnote — and Bree gets Sweatin’ It Out for it, which is the most euphemistic award name in the entire library.',
      },
      {
        type: 'paragraph',
        text: 'Now the part that makes it art. Bree spent this week claiming Case Keenum off the waiver wire. Case Keenum then went out and put up 28.5, the highest score by any player in the Monday night game, more than double what Jalen Hurts managed.',
      },
      { type: 'paragraph', text: 'Bree started Jalen Hurts. Case Keenum watched from the bench.' },
      {
        type: 'paragraph',
        text: 'She won anyway. She won a game she was sixty-four points down in, having correctly identified the single best play available on the wire and then declined to use it, which means the engine gave her The Waiver Wire Wizard for a decision she actively reversed. Bree, you are 2-1 and you are playing this game with your eyes closed and somehow it is working.',
      },
      { type: 'heading', text: 'Jesse Needed Twenty-Nine Points From A Defense And Received Nothing' },
      {
        type: 'paragraph',
        text: 'On Monday morning I laid out what Mr. Anderson required: the Philadelphia defense to have the game of its life, roughly twenty-nine points’ worth, while Saquon Barkley did nothing. Three takeaways. Ideally two of them returned. A performance people in that city would still be describing in thirty years.',
      },
      { type: 'paragraph', text: 'The Eagles defense scored zero point zero.' },
      {
        type: 'paragraph',
        text: 'Not a low number. Zero. The unit conceded twenty-seven points to a third-string quarterback and finished the evening with precisely nothing to show for it, which is a fantasy outcome so complete that I had to check the row twice to be sure it was not a null.',
      },
      {
        type: 'paragraph',
        text: 'Keshia wins 127.2 to 105.5. The team that had not won a game all season beat the team that led the league in points, and did it with Matthew Stafford throwing for 26.9 and Jordan Love adding 23.5 on a night when the man she was playing could not get double figures out of an entire professional football defense.',
      },
      {
        type: 'paragraph',
        text: 'Jesse is now 2-1. He is still second in this league for points scored. He has now lost to the manager with the fewest wins in it, and his last two weeks have featured a quarterback he picked up and benched, and a defense that posted a zero. The roster remains the most dangerous in the building. The man operating it continues to be its most interesting variable.',
      },
      { type: 'heading', text: 'James Won By Less Than The Touchdown His Own Quarterback Refused To Score' },
      {
        type: 'paragraph',
        text: 'Soft Tissue Issues beat Da Reigning Champ 121.8 to 117.0. A margin of 4.8, the closest game of the week, The Photo Finish, The Cat Burglar and The Mastermind all landing on the same manager in the same afternoon.',
      },
      {
        type: 'paragraph',
        text: 'And hanging over all of it: on Sunday, with Jacksonville up 28–6 and eight minutes left, Trevor Lawrence reached the one-yard line and took a knee rather than score. Bhayshul Tuten walked it in on the very next play. Lawrence is James’s quarterback. Tuten is in Tyler’s flex.',
      },
      {
        type: 'paragraph',
        text: 'A rushing touchdown is six points. James won by 4.8.',
      },
      {
        type: 'paragraph',
        text: 'Read that twice. The margin of victory was smaller than the points his own quarterback declined to take. Had Lawrence been a slightly worse sportsman, James wins comfortably. Had Chenell found one more catch anywhere on her roster, a man being gracious in a game that was already over would have cost James the week and handed Chenell a result she had no other route to.',
      },
      {
        type: 'paragraph',
        text: 'Chenell takes The Bad Beat — 117.0 and a loss — and it is the purest one this award has ever been given. She was not outplayed. She was out-sportsmanshipped, by a quarterback on somebody else’s team, in a game she had no stake in whatsoever.',
      },
      { type: 'heading', text: 'Doug Made Forty-Nine Roster Moves And Lost By Thirty-Five' },
      {
        type: 'paragraph',
        text: 'Forty-nine. I have checked this number four times and it has not moved.',
      },
      {
        type: 'paragraph',
        text: 'Forty-four of them were lineup changes. Doug spent week 3 opening the app, moving a player, closing the app, and then doing that forty-three more times. Nobody else in this league broke fifteen. Tyler made three. Justin made one.',
      },
      {
        type: 'paragraph',
        text: 'Nobody Knows scored 101.7, lost to Jay by 34.8, took The Galaxy Brain, and fell three places down the table. He also won The Socialist — 16.3 between his best starter and his worst, the flattest lineup in the league — which is the engine’s way of observing that all forty-four of those moves produced a roster of perfectly interchangeable men.',
      },
      {
        type: 'paragraph',
        text: 'Justin Jefferson went for 4.2. Malik Nabers went for 5.1. Marcus Mariota put 26.4 on the bench. Doug, I say this with real affection: the app is not the problem.',
      },
      { type: 'heading', text: 'The Rest Of The Petri Dish' },
      {
        type: 'paragraph',
        text: 'Tyler put 178.8 on Justin, the highest score of the week, with seven starters beating their projection and Bijan Robinson clearing his by 17.0. He is now top of the league for points scored and he did it with 37.7 sitting on his bench. Colin beat Mike 143.3 to 92.3 behind Tyler Shough’s 32.8 and Bo Nix’s 29.1, which is two quarterbacks nobody drafted in the first eight rounds doing more than most people’s first-rounders.',
      },
      {
        type: 'paragraph',
        text: 'Jay beat Doug with Jahmyr Gibbs going for 37.9 — twenty-eight percent of the whole score, The One Man Army — and finished 0.3 from his projection, which is The Control Group and the least eventful good afternoon anybody has had this year. Evan lost despite Jaxon Smith-Njigba’s 30.4, which is the second week running that receiver has been the best thing on his roster, and the second week running it has counted for nothing.',
      },
      {
        type: 'paragraph',
        text: 'And Mike posted 92.3, the lowest in the league, with Drake Maye managing 5.8 against a 22.6 projection. Two Dumpster Fires in three weeks. I said last week that the 55.4 was a floor and not a trend, and I would like the record to show that 92.3 is a thirty-seven point improvement and I am counting it.',
      },
      { type: 'heading', text: 'THE FINDINGS' },
      {
        type: 'paragraph',
        text: 'Seven of you are 2-1. Tyler, Jesse, Chenell, Jay, Bree, James and Colin, separated by nothing except points scored, with four more at 1-2 and Justin alone at the bottom holding the best individual performance of the week. Three weeks of data and the table has told us almost nothing, which is either beautiful parity or twelve people being equally mediocre at the same rate. I have not decided.',
      },
      {
        type: 'paragraph',
        text: 'The ledger, then. Chenell does not lose in September: wrong, dead, killed by my own Monday prediction, and I take the loss standing up. Bree posts a top-three score and wins one: half right — she won, but 125.4 was fifth, and half marks are the most humiliating grade available. Tyler’s 153.3 as the season’s highest losing score: still standing, with Chenell’s 117.0 the closest anybody came. Jesse’s roster and Mike’s floor: both still alive.',
      },
      {
        type: 'paragraph',
        text: 'Three new ones, delivered with the swagger of a man who just went three for three and is choosing not to mention the fourth.',
      },
      {
        type: 'paragraph',
        text: 'The logjam breaks by week 5 and Tyler is alone at the top of it. Justin wins in week 4, because a team that starts the best player in the league and goes 0-3 is not a bad team, it is a haunted one. And Doug makes another forty-plus move week before this season is out, because that is not a strategy, that is a compulsion, and compulsions do not respond to losing.',
      },
      { type: 'paragraph', text: 'Week four begins Thursday. Play Case Keenum.' },
    ],
  },
  {
    slug: 'week-3-everything-you-have-left-is-in-chicago',
    series: 'miracles',
    week: 3,
    title: 'Everything Any Of You Has Left Is In Chicago',
    summary:
      'Three matchups are still alive, both undefeated teams are losing, and every single unplayed player in this entire league is in one football game at Soldier Field. Evan is ahead by 3.3 and has nothing left but hope.',
    publishedAt: '2026-09-28',
    published: true,
    coverImage: '/recaps/week-3-miracles.jpg',
    coverAlt:
      'A lone football player kneeling in silhouette on the sideline under stadium floodlights.',
    author: BURNER,
    // Recorded after the fact. These three calls were made in the prose of this
    // post and never entered in the ledger, which is exactly the failure the
    // ledger exists to prevent — a prediction nobody can collect on is just a
    // sentence. All three landed.
    predictions: [
      {
        id: 'bree-beats-evan',
        claim: 'Bree wins. Jalen Hurts is not going to score three points.',
        verdict: 'correct',
        resolvedWeek: 3,
        resolution: 'Hurts scored 13.6. Bree won 125.4 to 115.1.',
      },
      {
        id: 'keshia-upsets-jesse',
        claim: 'Keshia wins, and the league leader takes his first loss to the team with no wins.',
        verdict: 'correct',
        resolvedWeek: 3,
        resolution:
          'Keshia won 127.2 to 105.5. Jesse\u2019s Eagles defense, the whole of '
          + 'his remaining inventory, scored 0.0.',
      },
      {
        id: 'james-holds-narrowly',
        claim: 'James holds on, narrowly, by less than a touchdown, which means Chenell loses.',
        verdict: 'correct',
        resolvedWeek: 3,
        resolution:
          'James won by 4.8 \u2014 less than a touchdown, and less than the '
          + 'touchdown his own quarterback declined to score on Sunday.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. It is Monday morning and I have been standing in front of the board since roughly four.',
      },
      {
        type: 'paragraph',
        text: 'Here is the finding, and it is a real one. Both undefeated teams in this league are losing.',
      },
      {
        type: 'paragraph',
        text: 'Jesse is 2-0 and trailing. Chenell is 2-0 and trailing. Between them they have the two best records and the two best point totals in the building, and tonight they are both being held under water by teams that have no business doing it — one of them by a manager who has not won a game all year.',
      },
      { type: 'paragraph', text: 'Three matchups are still alive. Everything that decides them happens tonight at Soldier Field, Eagles at Bears, 8:15. Six of you have a player in that game. Two of you have a season in it.' },
      { type: 'heading', text: 'THE BOARD, AS OF THIS MORNING' },
      {
        type: 'paragraph',
        text: 'Nothing below is final. Read every number as a thing that is still happening.',
      },
      {
        type: 'scoreboard',
        live: true,
        rows: [
          { top: 'Tyler’s Talented Team', topScore: 169.0, bottom: 'Substation Superstars', bottomScore: 106.2, note: 'Tyler still has D’Andre Swift' },
          { top: 'Dad Bod', topScore: 136.5, bottom: 'Nobody Knows', bottomScore: 101.7, note: 'over — nobody left' },
          { top: 'Nix Pix a Puka Six', topScore: 143.3, bottom: 'PKM Playmakers', bottomScore: 92.3, note: 'over — nobody left' },
          { top: 'All Bark, All Bite', topScore: 118.7, bottom: 'Mr. Anderson', bottomScore: 105.5, note: 'Saquon Barkley vs one defense' },
          { top: 'Burrow My Burden', topScore: 115.1, bottom: 'Bree’s Badass Boys', bottomScore: 111.8, note: 'Evan has nobody. Bree has Jalen Hurts.' },
          { top: 'Soft Tissue Issues', topScore: 112.5, bottom: 'Da Reigning Champ', bottomScore: 107.5, note: 'three players still on the field' },
        ],
      },
      { type: 'heading', text: 'THE MIRACLE: Evan Needs Jalen Hurts To Be Held Under 3.3 Points' },
      {
        type: 'paragraph',
        text: 'Burrow My Burden leads Bree’s Badass Boys by 3.3 points. Evan’s roster is finished. Every man he owns has played, showered, and gone home. He cannot score another point this week if he sets fire to the building.',
      },
      {
        type: 'paragraph',
        text: 'Bree has Jalen Hurts.',
      },
      {
        type: 'paragraph',
        text: 'Hurts is projected for 23.6. He has thrown five touchdowns in two games. Bree needs 3.4 of those 23.6 to win the matchup, which is to say she needs Jalen Hurts to complete roughly one pass to a man who is running forwards.',
      },
      {
        type: 'paragraph',
        text: 'So let us be precise about what Evan is praying for tonight, because it deserves to be said out loud. He needs a healthy starting quarterback, on a 2-0 team, in prime time, to finish an entire football game with under three and a half fantasy points. That is not a bad game. That is a filing error. That is the quarterback getting on the wrong bus.',
      },
      {
        type: 'paragraph',
        text: 'Evan, I want you to know that the laboratory is with you. The laboratory is also aware of the odds, and the laboratory has seen you check ESPN four times since you read this sentence.',
      },
      { type: 'heading', text: 'THE UPSET: The Winless Team Is Beating The Best Team In The League' },
      {
        type: 'paragraph',
        text: 'Keshia is 0-2. Keshia has the fourth-most points in this league and absolutely nothing to show for it, which I described a fortnight ago as the most unfair record in the building and have not been given any reason to revise.',
      },
      { type: 'paragraph', text: 'Keshia leads Mr. Anderson by 13.2.' },
      {
        type: 'paragraph',
        text: 'Jesse is 2-0. Jesse has scored 337.8 points, more than anybody. Jesse is the man I called the most dangerous roster in the league and its second-most dangerous manager, a description that has aged like a fine wine and is about to be poured over his head.',
      },
      {
        type: 'paragraph',
        text: 'Because here is what Jesse has left: the Philadelphia Eagles defense. That is the entire remaining inventory. One defense, projected for 9.8.',
      },
      {
        type: 'paragraph',
        text: 'And here is what Keshia has left: Saquon Barkley, projected 16.1, who rushed for over a thousand yards last season and who was a full participant on Friday and said he was good to go.',
      },
      {
        type: 'paragraph',
        text: 'Read those two sentences again and appreciate the shape of the thing. Jesse’s only surviving asset plays for the same team as Keshia’s. He needs the Eagles to be magnificent and the Eagles’ best offensive player to be invisible. He needs Philadelphia to win the game entirely with takeaways, ideally three of them, ideally returned for scores, while Saquon Barkley gains somewhere between four and nine yards over sixty minutes.',
      },
      {
        type: 'paragraph',
        text: 'Run the arithmetic and it is worse than it sounds. If Barkley simply hits his projection, Jesse needs roughly twenty-nine points from a defense. Twenty-nine. That is not a good night for a defense, that is a defense having the night people still talk about in that city thirty years later.',
      },
      {
        type: 'paragraph',
        text: 'The Bears, for their part, lead the NFL in rushing at 212.5 yards a game and are starting a third-string quarterback, Caleb Williams being out with a hamstring. Philadelphia has given up more than 120 on the ground in each of its first two games. I am not saying that is good news for Jesse. I am saying that if Chicago runs it forty times, nothing good happens for anybody holding an Eagles defense.',
      },
      { type: 'heading', text: 'THE KNIFE EDGE: James Is Five Points Up With Two Men Standing' },
      {
        type: 'paragraph',
        text: 'Soft Tissue Issues leads Da Reigning Champ 112.5 to 107.5, and this is the only matchup tonight where both managers still have a pulse and a player.',
      },
      {
        type: 'paragraph',
        text: 'Chenell has DeVonta Smith, projected 12.7, who caught ten balls for a hundred and seventeen yards and a touchdown eight days ago. That is one asset and it is a very good one.',
      },
      {
        type: 'paragraph',
        text: 'James has two: Dontayvion Wicks and Colston Loveland. Sixteen points of projection between them — a fourth receiver and a rookie tight end — and one of those two is a Chicago Bear on a night Chicago is starting its third quarterback of the season.',
      },
      {
        type: 'paragraph',
        text: 'So Chenell is holding the best receiver on the field, and James is holding two men who are on the field. Sixteen against twelve point seven, with a five-point head start. That is a lead measured in a single busted coverage.',
      },
      {
        type: 'paragraph',
        text: 'And now the part that is going to hurt, because it has already happened and nobody can do anything about it.',
      },
      {
        type: 'paragraph',
        text: 'On Sunday, with Jacksonville leading New England 28-6 and eight minutes left, Trevor Lawrence reached the one-yard line and took a knee. Declined the touchdown. New England called a timeout, and on the very next play Bhayshul Tuten walked in and scored it instead.',
      },
      {
        type: 'paragraph',
        text: 'Trevor Lawrence is James\u2019s quarterback. Bhayshul Tuten is in Tyler\u2019s flex.',
      },
      {
        type: 'paragraph',
        text: 'That is not a bad beat. That is a wire transfer. Six points lifted out of one manager\u2019s account and deposited into another\u2019s by a professional athlete demonstrating good sportsmanship, which is the most expensive thing anybody can do to you in this hobby. Asked about it afterwards, Lawrence said he probably should have just scored, and then joked that he was trying to support the Bhayshul Tuten fantasy people.',
      },
      {
        type: 'paragraph',
        text: 'He was. Tyler is up 62.8 and did not need a single one of those points. James is up 5.0 and needs all of them. If this matchup ends inside a touchdown tonight, the difference will be a man being gracious in a game that was already over, and I want that entered into the record before we find out.',
      },
      {
        type: 'paragraph',
        text: 'James, in fairness, is the man who ran a mathematically perfect lineup in week 2 and won The Mastermind for it. He does not guess. He also does not control who is throwing to Colston Loveland tonight, and of those two facts only one of them is going to matter.',
      },
      { type: 'heading', text: 'THE FORMALITIES' },
      {
        type: 'paragraph',
        text: 'Jay has beaten Doug 136.5 to 101.7 and both rosters are empty, so that one is over in everything but the database. Colin has put 143.3 on Mike and won by 51.1, which is Colin’s second demolition in three weeks and a genuinely confusing development for a man who spent all of September benching Stefon Diggs.',
      },
      {
        type: 'paragraph',
        text: 'And Tyler leads Justin 169.0 to 106.2 with D’Andre Swift still to play. Justin is 0-2 going on 0-3 and has now been beaten by 69.5, then 12.9, now this. Tyler does not need Swift. Tyler is going to get Swift anyway. There is no mercy rule in this laboratory and I have checked twice.',
      },
      { type: 'heading', text: 'WHAT I THINK HAPPENS' },
      {
        type: 'paragraph',
        text: 'With the confidence of a man who will be held to this in roughly thirty hours:',
      },
      {
        type: 'paragraph',
        text: 'Bree wins. Jalen Hurts is not going to score three points, and Evan is going to spend the evening watching a football game he has no rooting interest in except catastrophe. It is the cruellest position on the board and it is also, I am sorry to say, the funniest.',
      },
      {
        type: 'paragraph',
        text: 'Keshia wins, and the league leader takes his first loss to the team with no wins, which is the single best thing that could happen to this season for reasons that are entirely selfish on my part.',
      },
      {
        type: 'paragraph',
        text: 'And James holds on, narrowly, by less than a touchdown, which means Chenell loses. That matters to me personally: I went on the record in week 1 saying Chenell does not lose in September, it has survived two weeks, and I am now calling against my own prediction with four days of September left. Do with that what you like.',
      },
      { type: 'paragraph', text: 'Kickoff is 8:15. Six of you cannot look away. Three of you should probably eat something first.' },
    ],
  },
  {
    slug: 'week-2-the-bill-arrives',
    week: 2,
    title: 'Everybody Found The Right Guy. Half Of You Sat Him.',
    summary:
      'Josh Allen threw for five. Drew Lock threw for three and one of you benched him. Bree made thirteen roster moves and lost by twenty-two. Week 2 was the league discovering that knowing the answer and writing it down are separate skills.',
    publishedAt: '2026-09-22',
    published: true,
    coverImage: '/recaps/week-2.jpg',
    coverAlt:
      'A receiver silhouetted mid-air against stadium floodlights, reaching for a deep ball.',
    author: BURNER,
    predictions: [
      {
        id: 'bree-bounces-back',
        claim:
          'Bree posts a top-three score again before October and finally wins one of these.',
        verdict: 'partial',
        resolvedWeek: 3,
        resolution:
          'She won, coming back from 64.7 down to beat Evan. But 125.4 was the '
          + 'fifth-best score of the week, not top three. Half marks, which is '
          + 'the most humiliating grade available.',
      },
      {
        id: 'mike-not-last',
        claim: 'Mike does not finish the season in last place. The 55.4 is the floor, not the trend.',
      },
      {
        id: 'jesse-bench-again',
        claim:
          'Jesse leaves another twenty-plus on the bench before week 5, and wins that week anyway.',
        verdict: 'wrong',
        resolvedWeek: 4,
        resolution: 'Jesse lost in week 3 and again in week 4, by 50.5 to Bree. The window closed without a win.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. The bill has arrived.',
      },
      {
        type: 'paragraph',
        text: 'Last Tuesday I stood in this laboratory and told you the problem with this league was that nobody could operate a lineup. One of you benched a quarterback who went for thirty-eight. Another found the best free agent on the wire, spent the claim, and then admired him through glass.',
      },
      {
        type: 'paragraph',
        text: 'This week the sample doubled and the finding held.',
      },
      {
        type: 'paragraph',
        text: 'A manager claimed Drew Lock off the wire on Saturday and left him on the bench on Sunday, where he threw three touchdowns. Another benched Kirk Cousins, the single most surprising quarterback in professional football right now, and lost by twenty-two while doing it. A third benched Stefon Diggs for the second consecutive week, which at this point is not an oversight, it is a policy.',
      },
      { type: 'paragraph', text: 'Twelve subjects. Two weeks. One recurring pathology.' },
      { type: 'paragraph', text: 'I have never been happier.' },
      { type: 'heading', text: 'BILLS 41, LIONS 31 — The Two Best Teams In This League Were In One Game' },
      {
        type: 'paragraph',
        text: 'Josh Allen threw for 248 and three scores and ran in two more — five touchdowns, no interceptions, nine on the season through two games, and an MVP conversation that is starting to sound less like a conversation and more like a formality. Buffalo won 41–31 in their new building.',
      },
      {
        type: 'paragraph',
        text: 'Jesse started Josh Allen and collected 46.8, the best single-player number anybody in this league has produced all year.',
      },
      {
        type: 'paragraph',
        text: 'And on the other sideline: Jared Goff for 37.8 and Amon-Ra St. Brown for 30.7, both Tyler’s, both losing the actual football game and winning the fantasy one. Sixty-eight and a half points out of a single Detroit loss.',
      },
      {
        type: 'paragraph',
        text: 'One football game produced the highest individual score of the week and the two biggest pieces of the highest team score of the week, for two different managers, on opposite sides of the ball. That is not a coincidence you can plan for. That is just the schedule occasionally deciding to be interesting.',
      },
      { type: 'heading', text: 'SEAHAWKS 31, CARDINALS 7 — The 82-Yard Indictment' },
      {
        type: 'paragraph',
        text: 'Sam Darnold sat this one out with a glute injury, so Drew Lock made his first Seattle start since 2023 and proceeded to throw three touchdowns to Jaxon Smith-Njigba, including an 82-yard bomb that was the longest catch of Smith-Njigba’s career. Seattle 31, Arizona 7, and it was never that close.',
      },
      {
        type: 'paragraph',
        text: 'Evan started Jaxon Smith-Njigba and banked 38.0 against a 15.2 projection, which won him Fantasy Nostradamus and, by 11.3 points, his football game.',
      },
      {
        type: 'paragraph',
        text: 'Jesse claimed Drew Lock off the wire this week. Jesse then started somebody else.',
      },
      {
        type: 'paragraph',
        text: 'Twenty-seven point four, from the bench, from a quarterback this manager had identified, targeted and acquired seventy-two hours earlier. The engine gave Jesse The Waiver Wire Wizard and The Understudy for the same player in the same week, which I believe is a first, and which is the single most Lab Rats sentence I have ever had the privilege of typing.',
      },
      {
        type: 'paragraph',
        text: 'One manager caught the ball. The other one benched the man throwing it. They were watching the same broadcast.',
      },
      { type: 'heading', text: 'COWBOYS OVER COMMANDERS — Dak Passes Romo' },
      {
        type: 'paragraph',
        text: 'Four touchdown passes, and with them Dak Prescott moved past Tony Romo for the most passing touchdowns in Dallas history — 248 and counting. Dallas looked like the version of itself that shows up in September and gets everybody excited.',
      },
      {
        type: 'paragraph',
        text: 'Chenell had Dak in the superflex for 37.8. Jay had CeeDee Lamb for 31.3. Both won. Both are currently pretending that was research.',
      },
      { type: 'heading', text: 'RAMS 28, GIANTS 6 — Four Managers, One Monday Night' },
      {
        type: 'paragraph',
        text: 'Matthew Stafford went for 36.0 and Davante Adams for 35.5 as the Rams bounced back on Monday night. Keshia owned the quarterback. Bree owned the receiver. Neither of them won their matchup, which is its own kind of achievement.',
      },
      {
        type: 'paragraph',
        text: 'On the New York side: Jaxson Dart took a hit to his left knee on the opening drive and did not return — initial exams point to a sprained MCL — and Malik Nabers left in the first quarter with a shoulder problem, returned, and finished with one catch for one yard. Owing to an unresolved matter involving a clinic in Nicaragua, I am not at liberty to share an opinion on either of them.',
      },
      {
        type: 'paragraph',
        text: 'The fantasy arithmetic, however, is brutal and belongs to us. Mike started Dart in the superflex and received 0.8. Doug started Nabers in the flex and received 0.6. Neither of those was a bad call on Sunday morning and neither manager is getting roasted for it here.',
      },
      {
        type: 'paragraph',
        text: 'What happened to the rest of their lineups is an entirely different conversation.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'Bookkeeping. Six results, then the autopsies.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Tyler’s Talented Team', topScore: 166.8, bottom: 'Bree’s Badass Boys', bottomScore: 144.4 },
          { top: 'Mr. Anderson', topScore: 140.3, bottom: 'Nix Pix a Puka Six', bottomScore: 81.4 },
          { top: 'Da Reigning Champ', topScore: 135.8, bottom: 'Substation Superstars', bottomScore: 122.9 },
          { top: 'Burrow My Burden', topScore: 133.0, bottom: 'All Bark, All Bite', bottomScore: 121.7 },
          { top: 'Dad Bod', topScore: 132.3, bottom: 'PKM Playmakers', bottomScore: 55.4 },
          { top: 'Soft Tissue Issues', topScore: 121.2, bottom: 'Nobody Knows', bottomScore: 103.1 },
        ],
      },
      { type: 'heading', text: 'Bree Made Thirteen Roster Moves And Benched The Best Story In Football' },
      {
        type: 'paragraph',
        text: 'Thirteen. Thirteen roster moves in one week. Waivers, free agents, a trip to injured reserve — Bree spent the week with both hands in the machine, and the engine handed over The Galaxy Brain for it.',
      },
      {
        type: 'paragraph',
        text: 'Here is the thing that makes it hurt. Bree scored 144.4. That is the second-best total in the entire league this week and it beat five of the six winning scores. In almost any other matchup that is a comfortable afternoon with time to spare.',
      },
      {
        type: 'paragraph',
        text: 'Bree drew Tyler’s 166.8 and lost by 22.4. The Bad Beat, two weeks running, to two different managers, for the same crime of scoring plenty on the wrong Sunday.',
      },
      {
        type: 'paragraph',
        text: 'And sitting on that bench the entire time: Kirk Cousins, 27.2 points, the thirty-eight-year-old who has quietly become the most improbable story of the NFL season and dragged Las Vegas to 2-0 for the first time since 2021. Bree touched that roster thirteen times in a week and not one of those touches was the one that mattered.',
      },
      { type: 'paragraph', text: 'Fewer moves. Better moves.' },
      { type: 'heading', text: 'Tyler Read Last Week’s Report And Did Something About It' },
      {
        type: 'paragraph',
        text: 'I want to give credit where it is genuinely due, because it happens rarely enough that it should be an event.',
      },
      {
        type: 'paragraph',
        text: 'Last Sunday Tyler benched Bryce Young and watched him throw for 361 and four scores from a folding chair, in a week Tyler lost by 12.7 while posting the second-highest total in the league. It was the cruelest result on the page.',
      },
      {
        type: 'paragraph',
        text: 'This week Tyler started Bryce Young. Thirty point one. Add Goff’s 37.8 and St. Brown’s 30.7 and you get 166.8 — the highest score of the week, five starters over projection, Slay Girl Slay, and a jump from seventh to third.',
      },
      {
        type: 'paragraph',
        text: 'The subject adjusted the variable and the outcome changed. That is the entire scientific method, executed by a man who a week ago I was fairly sure had never met it.',
      },
      { type: 'heading', text: 'Colin Has Now Benched Stefon Diggs Twice' },
      {
        type: 'paragraph',
        text: 'In week 1, Colin identified Stefon Diggs as the best available free agent, spent the claim, cut a player to make room, and then declined to start him. I closed that recap by asking somebody to stand over Colin until the assignment was handed in.',
      },
      { type: 'paragraph', text: 'Nobody did.' },
      {
        type: 'paragraph',
        text: 'Diggs went for 19.2 this week against an 8.1 projection. From the bench. Again. Colin scored 81.4 and lost by 58.9 — the third-lowest total anybody has posted this season. The 19.2 was sitting in reserve the entire time, in a Washington uniform, available to anybody willing to click on it.',
      },
      {
        type: 'paragraph',
        text: 'Colin, I am begging you. The button is right there. It is a different color from the other buttons.',
      },
      { type: 'heading', text: 'PKM Playmakers Scored 55.4 And Won An Award For Consistency' },
      {
        type: 'paragraph',
        text: 'Fifty-five point four. It is the lowest score in the short history of this league by more than twenty-five points and I want to handle it carefully, because a chunk of it walked off with a knee injury on the opening drive of Monday night.',
      },
      {
        type: 'paragraph',
        text: 'But the rest of it is a marvel. Mike’s highest-scoring starter was Trey McBride at 14.1. His quarterback managed 9.0 against a 21.9 projection. His kicker managed 2.0. His defense managed minus one.',
      },
      {
        type: 'paragraph',
        text: 'And because The Socialist measures how EVENLY a lineup scores rather than how well, Mike won it. Just 15.1 points separated his best starter from his worst. Perfect distribution. Total equality. Every single player contributing exactly the same amount of nothing.',
      },
      {
        type: 'paragraph',
        text: 'It is the funniest award this engine has ever produced and I am deeply sorry it landed here. Mike went 1-0 in week 1 on the back of one rookie quarterback and 1-1 in week 2 on the back of the same rookie quarterback’s knee. That is not a management problem. That is a concentration problem, and it is fixable.',
      },
      { type: 'heading', text: 'The Champ Did It Again And I Am Getting Suspicious' },
      {
        type: 'paragraph',
        text: 'At some point during the Sunday early games, Chenell was trailing Justin by 35.8 points. Final: 135.8 to 122.9.',
      },
      {
        type: 'paragraph',
        text: 'That is Sweatin’ It Out in back-to-back weeks. Two Sundays, two enormous deficits, two wins. Chenell is 2-0, has never once led a football game at a moment when it would have been comfortable, and is sitting second in the league with the reigning champion’s crown still on.',
      },
      {
        type: 'paragraph',
        text: 'I have stopped believing this is luck. I do not yet have a mechanism. Give me until October.',
      },
      { type: 'heading', text: 'The Rest Of The Petri Dish' },
      {
        type: 'paragraph',
        text: 'James ran a mathematically perfect lineup — 121.2 actual, 121.2 optimal, not one point misplaced anywhere on the roster — and took The Mastermind for it. He also took The Cat Burglar, because Patrick Mahomes went for 35.0 in a wild overtime win over Indianapolis and the other nine slots mostly watched. A week after losing by 2.6 to the stingiest win of the round, James went out and produced one himself. It is not pretty. It is 1-1.',
      },
      {
        type: 'paragraph',
        text: 'Evan won the closest game of the week by 11.3 with a Patriots defense that put up 23.0 — New England was one of five defenses on Sunday to hold an opponent without a touchdown — and a receiver who beat his projection by 22.8. Genuinely the best-managed week anybody had.',
      },
      {
        type: 'paragraph',
        text: 'Keshia got 36.0 out of Matthew Stafford, which is worth pausing on: last Sunday Stafford was her weakest starter at 5.1, the number that won her The Socialist. Same player, same manager, thirty-one points of difference. She lost anyway and is 0-2, which is the most unfair record in the league right now.',
      },
      {
        type: 'paragraph',
        text: 'Doug dropped his first game of the season, scoring 103.1 — his lowest of the year — in a week where 103.1 was never going to be enough. Free Fallin’ stays unclaimed for a second week, for a reason I find genuinely annoying: the laboratory cannot yet compare this week’s table to last week’s on the same terms, so the instrument is withheld rather than guessed at. Doug gets a reprieve he did nothing to earn.',
      },
      {
        type: 'paragraph',
        text: 'Justin finished 0.8 away from his projection — The Control Group, near-perfect forecasting, absolutely nothing to talk about — and lost. Jonathan Taylor went for 27.2 and Brock Purdy for 32.5 and he is still 0-2. Meanwhile Jay put 132.3 on Mike and won by 76.8, the largest margin this league has ever recorded, and I am contractually obliged to mention that a 76.8-point victory and a 12.9-point victory are worth exactly the same in the table.',
      },
      { type: 'heading', text: 'THE FINDINGS' },
      {
        type: 'paragraph',
        text: 'Two weeks. Twenty-four matchups of data. One clear result: this league can find talent and cannot deploy it. Between them, the managers of the Lab Rats left Drew Lock, Kirk Cousins and Stefon Diggs on their benches for a combined 73.8 points. Two of the three lost. The third was Jesse, who won by 58.9 and therefore will not learn a thing.',
      },
      { type: 'paragraph', text: 'Now, the ledger. I made three calls last week and I am settling none of them, because all three are still standing.' },
      {
        type: 'paragraph',
        text: 'Chenell does not lose in September — still alive, 2-0, and now genuinely frightening. Tyler’s 153.3 as the season’s highest losing score — still alive, and Bree took a 144.4 run at it on Sunday and came up short. And Jesse: most dangerous roster in the league, second-most dangerous manager of it. He leads the league in points, he is 2-0, and he benched a man who threw three touchdowns. I would like that one engraved.',
      },
      {
        type: 'paragraph',
        text: 'Three new calls, delivered with the total confidence of a man who has been wrong about nothing yet because nothing has resolved.',
      },
      {
        type: 'paragraph',
        text: 'Bree posts another top-three score before October and finally wins one. Mike does not finish last — the 55.4 is a floor, not a trend. And Jesse leaves another twenty-plus on his bench before week 5, and wins that week anyway, because that is who he is.',
      },
      {
        type: 'paragraph',
        text: 'Check your lineups. Play Stefon Diggs. Week three begins Thursday.',
      },
    ],
  },
  {
    slug: 'week-1-the-scoring-record-fell',
    week: 1,
    title: 'The Scoring Record Fell. So Did Most Of You.',
    summary:
      'The NFL played its highest-scoring opening Sunday in the history of the sport. The Lab Rats answered with a 197 that still got roasted, a 153 that lost, and a manager who found the right receiver on waivers and then refused to play him.',
    publishedAt: '2026-09-15',
    published: true,
    coverImage: '/recaps/week-1.jpg',
    coverAlt:
      'A lone football player silhouetted against stadium floodlights in heavy rain.',
    author: BURNER,
    predictions: [
      {
        id: 'chenell-september',
        claim: 'Chenell does not lose in September.',
        verdict: 'wrong',
        resolvedWeek: 3,
        resolution:
          'Chenell lost to James by 4.8 on 28 September, with two days of the '
          + 'month left. Killed by my own Monday prediction that James would '
          + 'hold on, which means I called the death of this one and was right '
          + 'about that too.',
      },
      {
        id: 'jesse-roster',
        claim:
          'Jesse has the most dangerous roster in the league and is its second-most dangerous manager.',
      },
      {
        id: 'tyler-highest-losing-score',
        claim:
          'Tyler\u2019s 153.3 will finish the season as the highest losing score anybody posts.',
        verdict: 'wrong',
        resolvedWeek: 5,
        resolution:
          'Doug scored 172.8 in week 5 and lost by 18.5, clearing it by 19.5 and '
          + 'taking the all-time record with him.',
      },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Colleagues. Lab rats. I have been awake since Thursday and I have seen things.',
      },
      {
        type: 'paragraph',
        text: 'The National Football League just played the highest-scoring opening Sunday in the recorded history of the sport. Six games cleared sixty combined points. One of them cleared ninety-six. Somewhere in a league office an actuary is face-down on a desk.',
      },
      {
        type: 'paragraph',
        text: 'And on that same afternoon, with the entire sport detonating in every direction at once, one of you scored eighty-one points.',
      },
      { type: 'paragraph', text: 'Eighty-one.' },
      {
        type: 'paragraph',
        text: 'Conditions were perfect. Every variable was screaming in your favor. A trained monkey with a coin clears a hundred and ten.',
      },
      { type: 'paragraph', text: 'God, I love this job.' },
      { type: 'heading', text: 'BEARS 59, PANTHERS 37 — Somebody Left The Gas On' },
      {
        type: 'paragraph',
        text: 'Ninety-six combined points, the highest-scoring Week 1 game the NFL has ever staged, and a defensive coordinator somewhere is currently updating a résumé in a parked car.',
      },
      {
        type: 'paragraph',
        text: 'Caleb Williams threw for 269 and two scores, ran for 65 and two more, and spent four quarters responding to every word ever written about him in the form of a war crime. Bryce Young answered with 361 yards, three passing touchdowns and a rushing one — the best game of his career, and he lost by twenty-two. D’Andre Swift: 124 and three. Kyle Monangai: a hundred more, including a 61-yard sprint the Carolina defense watched the way you would watch a house fire.',
      },
      {
        type: 'paragraph',
        text: 'Four managers in this league had a stake in that game.',
      },
      { type: 'paragraph', text: 'Two of them played it correctly.' },
      {
        type: 'paragraph',
        text: 'Jesse started Caleb Williams and banked 41.3, the largest single-player number in the league. Tyler started D’Andre Swift and banked 31.9. Chenell then watched Monangai post 19.4 from the bench. Jesse watched Chuba Hubbard post 22.2 from the bench. And Tyler — Tyler we are going to handle separately, at length, and without mercy.',
      },
      { type: 'heading', text: 'RAVENS 41, COLTS 23 — Chenell Has Purchased The City Of Baltimore' },
      {
        type: 'paragraph',
        text: 'Derrick Henry went for 144 yards and three touchdowns and moved past Marcus Allen on the all-time list, because at this stage of his career the man is less a running back than a geological event. Lamar Jackson went 17 of 25 for 324 and a score and ran in another one himself. Baltimore put 31 on the board before halftime and was never once inconvenienced.',
      },
      {
        type: 'paragraph',
        text: 'Both of them belong to Chenell.',
      },
      {
        type: 'paragraph',
        text: 'The reigning champion did not draft a fantasy football team. The reigning champion acquired commercial real estate in Maryland and collects rent on it every Sunday. Henry and Jackson combined for 61.8 of a 166.0 — the Baltimore backfield and the man handing it the ball, on one roster, in a game Baltimore led from the opening minutes to the end. Eleven of you drafted players. Chenell drafted a municipality.',
      },
      { type: 'heading', text: 'SEAHAWKS 13, PATRIOTS 10 — Five Snaps' },
      {
        type: 'paragraph',
        text: 'The defending champions opened their title defense, and Sam Darnold’s afternoon lasted five snaps before a hip injury ended it. Drew Lock came in, went 16 of 22 for 187 and a score, and Seattle ground out thirteen unanswered. No timetable on Darnold. The last time I offered a medical opinion there was a settlement, so that is where the reporting ends.',
      },
      {
        type: 'paragraph',
        text: 'The consequence here was immediate. Tyler had Darnold in the superflex at a projected 17.6 — about as ordinary a Sunday-morning call as this format offers.',
      },
      {
        type: 'paragraph',
        text: 'Zero point five points. I ran the sample through the centrifuge three times. It keeps separating into a rounding error and a small quantity of regret.',
      },
      {
        type: 'paragraph',
        text: 'Hold that thought. I will need it in four hundred words, and it is worse than you are expecting.',
      },
      { type: 'heading', text: 'BENGALS 33, BUCCANEERS 27 — Two Catches' },
      {
        type: 'paragraph',
        text: 'Cincinnati won a shootout. Ja’Marr Chase, the best wide receiver currently drawing breath, was targeted four times, caught two, and finished with twelve yards — his quietest afternoon since November of 2023. Tampa Bay bracketed him for sixty minutes and dared anybody else to beat them. Anybody else beat them.',
      },
      { type: 'paragraph', text: 'James started Ja’Marr Chase.' },
      { type: 'paragraph', text: 'James received 2.2 points.' },
      { type: 'paragraph', text: 'James lost by 2.6.' },
      {
        type: 'paragraph',
        text: 'I am not going to insult a room full of adults by connecting those three sentences. I will leave them stacked where they are, like a body.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'A portion of my funding is contingent on bookkeeping. Six results, then back to the autopsies.',
      },
      {
        type: 'scoreboard',
        rows: [
          { top: 'Mr. Anderson', topScore: 197.4, bottom: 'Dad Bod', bottomScore: 148.9 },
          { top: 'Da Reigning Champ', topScore: 166.0, bottom: 'Tyler’s Talented Team', bottomScore: 153.3 },
          { top: 'Nobody Knows', topScore: 150.7, bottom: 'Substation Superstars', bottomScore: 81.2 },
          { top: 'Bree’s Badass Boys', topScore: 124.4, bottom: 'All Bark, All Bite', bottomScore: 119.9 },
          { top: 'Nix Pix a Puka Six', topScore: 118.1, bottom: 'Burrow My Burden', bottomScore: 102.4 },
          { top: 'PKM Playmakers', topScore: 114.0, bottom: 'Soft Tissue Issues', bottomScore: 111.5 },
        ],
      },
      {
        type: 'stat',
        label: 'The spread, week one',
        value: '197.4 down to 81.2',
        note: 'A 116.2-point gap between the best and worst lineups in a twelve-team league. In a normal season that is a December outlier. Here it was a Sunday.',
      },
      { type: 'heading', text: 'Mr. Anderson Scored 197 And The Machine Still Called Them An Idiot' },
      {
        type: 'paragraph',
        text: '197.4. Thirty-one and a half clear of second place. More than double what the last-place lineup managed. Caleb Williams 41.3. Josh Allen 39.7. David Montgomery 27.4 against an 11.7 projection, which is less a performance than a clerical error in Jesse’s favor.',
      },
      {
        type: 'paragraph',
        text: 'By every measure a scoreboard understands, that was a masterpiece.',
      },
      { type: 'paragraph', text: 'The optimizer took one look at it and laughed.' },
      {
        type: 'paragraph',
        text: 'Jesse’s best legal lineup was worth 238.2. Christian Watson put up 29.7 in cold storage, Chuba Hubbard 22.2 on the shelf beside him. Arrange the right names in the right slots and that roster beats the best score anybody in this league produced all week by forty points.',
      },
      {
        type: 'paragraph',
        text: 'The Bench Bum is supposed to be a participation ribbon for somebody who lost badly and knows exactly why. Jesse won by 48.6 and earned it anyway. That is a brand new specimen and I am naming it after him.',
      },
      {
        type: 'paragraph',
        text: 'Congratulations, Jesse. You are the most talented manager in this league and you are leaving money on the table like a tourist.',
      },
      { type: 'heading', text: 'Tyler Scored 153.3 One Man Short And Lost Anyway' },
      {
        type: 'paragraph',
        text: 'Here is the thought I asked you to hold. Tyler’s Talented Team scored 153.3, the second-highest total in the league. Drop that number into four of the six matchups this week and Tyler wins comfortably, opens 1-0, and none of us discusses it again.',
      },
      { type: 'paragraph', text: 'Tyler drew the champion. Tyler lost by 12.7. Tyler also did all of that while one of ten starting slots returned half a point.' },
      {
        type: 'paragraph',
        text: 'And before anybody gets clever in the group chat: that was a defensible Sunday-morning decision made by somebody with no access to the future. Young and Rodgers sat behind Darnold projected 19.4 and 18.5 — noise, not a gap. The experiment simply lost its subject on the fifth snap, and no amount of preparation covers that. I roast bad methodology. I do not roast a specimen walking out of the building.',
      },
      {
        type: 'paragraph',
        text: 'Which is exactly what makes it the cruelest line on this page. Tyler played nine-tenths of a lineup from the opening drive of the season, posted a number that beats two thirds of this league, and lost. The Bad Beat is not an insult. It is a coroner’s finding.',
      },
      {
        type: 'paragraph',
        text: 'Bryce Young, meanwhile, spent that same afternoon throwing for 361 and three scores in the highest-scoring game in Week 1 history — 38.4 points, from Tyler’s bench, in a week that was already lost. The Understudy is the most tasteless award in the library and it landed on the manager who least deserved to be handed anything.',
      },
      {
        type: 'paragraph',
        text: 'Tyler will win ten games this season. Tyler will also spend every one of them being reminded about coming up short in Week 1.',
      },
      { type: 'heading', text: 'Colin Did All The Work And Then Refused To Collect' },
      {
        type: 'paragraph',
        text: 'Full credit, sincerely, no notes: Colin identified Stefon Diggs as the best available free agent, spent the claim, cut Travis Hunter for the spot, and watched Diggs deliver 13.5 against a 7.5 projection. The whole waiver process executed flawlessly, by a manager doing homework on a Tuesday night while you slept.',
      },
      { type: 'paragraph', text: 'Colin then benched him.' },
      {
        type: 'paragraph',
        text: 'Diggs sat. Beside him sat Tyler Shough, who scored 33.2. Those two combined for 46.7 points — roughly forty percent of everything Colin actually started — and Colin won by 15.7 regardless, the most infuriating detail in this document.',
      },
      {
        type: 'paragraph',
        text: 'There is a version of this league in which Colin is genuinely frightening. It requires Colin to take Colin’s advice. Until then we have a manager who does the reading, shows the work, reaches the correct answer, and then forgets to turn in the assignment. Gonna need more follow through, Colin.',
      },
      { type: 'heading', text: 'The Champ Was Down 46.7 And Did Not Break A Sweat' },
      {
        type: 'paragraph',
        text: 'At some point during the Sunday afternoon window, Chenell was trailing by 46.7 points. That is not a deficit. That is a diagnosis.',
      },
      {
        type: 'paragraph',
        text: 'The comeback had a postmark on it. Isaiah Likely — who plays for the Giants now, a fact I recommend the rest of you commit to memory — posted 23.8 against a 7.6 projection, and Dak Prescott added 19.4 for Dallas. Chenell owned both ends of the same Sunday night game and billed it for 43.2 points.',
      },
      { type: 'paragraph', text: 'Final: 166.0 to 153.3.' },
      {
        type: 'paragraph',
        text: 'All of that while Chenell’s kicker and defense combined for exactly 2.0 points. One apiece, against projections of 9.1 and 9.3. Two unmanned roster spots, a 46.7-point hole, and a win. Something deeply unfair is happening here and I intend to investigate it.',
      },
      {
        type: 'paragraph',
        text: 'One week in and this title defense already feels less like a competition than an inevitability. The crown is doing structural damage to eleven people’s self-esteem.',
      },
      {
        type: 'paragraph',
        text: 'Somebody intervene before this becomes a documentary.',
      },
      { type: 'heading', text: 'Doug Played A Perfect Game Against Somebody Who Was Asleep' },
      {
        type: 'paragraph',
        text: 'Nobody Knows scored 150.7. The best lineup Doug’s roster could legally field also scored 150.7. Not a point misplaced. Justin Jefferson 27.2, Ashton Jeanty 29.7, and every last decision correct on the first attempt.',
      },
      { type: 'paragraph', text: 'Doug won by 69.5.' },
      {
        type: 'paragraph',
        text: 'Doug could have benched three starters at random, gone outside, and still won by thirty.',
      },
      {
        type: 'paragraph',
        text: 'The one manager who got every call right is the one manager who needed none of them. I cannot decide whether that is the most impressive thing on this page or the cruelest.',
      },
      { type: 'heading', text: 'The Trade Where Everybody Won And Everybody Lost' },
      {
        type: 'paragraph',
        text: 'On the fourth of September, Justin sent Trevor Lawrence and Rome Odunze to James for Brock Purdy and MarShawn Lloyd. Clean. Two for two. Adults negotiating in good faith, which around here is itself a minor scandal.',
      },
      {
        type: 'paragraph',
        text: 'Week one: Purdy scored 28.1 for Justin, Lawrence 34.1 for James. Both quarterbacks showed up. Both halves of the deal did exactly what they were built to do.',
      },
      {
        type: 'paragraph',
        text: 'Justin then posted 81.2, the lowest in the league, and lost by 69.5. James then lost by 2.6 because the best receiver in football caught two passes for twelve yards.',
      },
      {
        type: 'paragraph',
        text: 'Two managers made a good trade and the universe billed them both anyway. Get it framed.',
      },
      { type: 'heading', text: 'The Rest Of The Petri Dish' },
      {
        type: 'paragraph',
        text: 'Mike won the closest game of the week, by 2.6, with the week’s lowest winning score of 114.0 — of which Jaxson Dart was 32.6. Twenty-nine percent of a victory from one rookie quarterback, and three awards for an afternoon of bare minimum executed with surgical precision. The Cat Burglar takes only what the job requires and is out the window before the lights come on. Not pretty. 1-0.',
      },
      {
        type: 'paragraph',
        text: 'Bree finished 4.3 off her projection and won by 4.5, the most Bree result available to modern science, and I mean that as a compliment to nobody’s entertainment value. Kenneth Walker 32.6, Jalen Hurts 30.7, and Kirk Cousins posting 21.8 on the bench as a reminder that this league has more startable quarterbacks than places to start them.',
      },
      {
        type: 'paragraph',
        text: 'Keshia lost by 4.5 with a lineup running from Jordan Love at 24.5 down to Matthew Stafford at 5.1 — a spread of 19.4, the flattest in the league. Everybody chipped in, nobody carried, and the whole thing had the energy of a group project. The Steelers defense turned in the league’s best D/ST performance at 21.0: a lovely thing to own, a grim thing to need.',
      },
      {
        type: 'paragraph',
        text: 'Jay made six roster moves — three free agents, one lineup change, two trips to injured reserve — and posted 148.9, beating seven of the other eleven teams. Jay drew the 197.4. There is no lesson here. Sometimes you do everything right and the experiment kills you anyway.',
      },
      {
        type: 'paragraph',
        text: 'Prayers up for Evan and Kyler Murray, whose Minnesota debut ended early and took the rest of Evan’s team down with him. Evan posted a total score of 102.4 and lost by 15.7. Some variables are not yours to control. We’ll all hope for a cleaner sample next week.',
      },
      { type: 'heading', text: 'THE FINDINGS' },
      {
        type: 'paragraph',
        text: 'One week. Twelve subjects. A scoring environment that broke a record older than most of this room, and a table in which the highest scorer left forty points on the bench, the second-highest scorer lost, and the perfect lineup won by a margin that made perfection pointless.',
      },
      {
        type: 'paragraph',
        text: 'Now the hot takes, delivered with the absolute confidence of a man holding no evidence.',
      },
      {
        type: 'paragraph',
        text: 'Chenell does not lose in September. Print it. Bring it back to me in three weeks when I am wrong and I will eat the page on camera.',
      },
      {
        type: 'paragraph',
        text: 'Jesse has the most dangerous roster in this league and is, at present, its second-most dangerous manager.',
      },
      {
        type: 'paragraph',
        text: 'And Tyler’s 153.3 will finish the season as the highest losing score anybody posts, which is the sort of record that follows a person all the way to their funeral.',
      },
      {
        type: 'paragraph',
        text: 'Check your lineups. Play your quarterbacks. Somebody stand over Colin until the assignment is handed in.',
      },
      {
        type: 'paragraph',
        text: 'The lab is open. Week two begins Thursday. Try to be worth writing about.',
      },
    ],
  },
  {
    slug: 'week-0-the-lab-opens',
    week: 0,
    title: 'The Lab Opens',
    summary:
      'Twelve managers, thirteen weeks, one trophy. Before a single snap, here is what everyone is walking into — and the one format detail most likely to be misread on draft night.',
    publishedAt: '2026-09-01',
    published: true,
    author: BURNER,
    body: [
      {
        type: 'paragraph',
        text: 'Nobody has scored a point yet, which makes this the only week all season where everyone is right about their team. Enjoy it.',
      },
      {
        type: 'paragraph',
        text: 'The Lab Rats enter their second season with the same twelve managers and one meaningful difference: Chenell Basilio is defending something now. Last year she was another name in the table. This year her avatar has a crown on it, and the other eleven teams have spent an offseason thinking about how to take it off.',
      },
      { type: 'heading', text: 'What the format is asking of you' },
      {
        type: 'paragraph',
        text: 'Thirteen weeks of regular season, six playoff berths, and a first-round bye for the top two seeds. That last detail matters more than it sounds. The difference between the second and third seed is an entire extra week of not being eliminated.',
      },
      {
        type: 'stat',
        label: 'Starting lineup',
        value: 'QB · RB · RB · WR · WR · TE · FLEX · OP · D/ST · K',
        note: 'The OP slot accepts a quarterback. This is a superflex league, whether or not everyone drafts like it.',
      },
      {
        type: 'paragraph',
        text: 'That superflex slot is the single biggest strategic fact about this league, and the one most likely to be misread on draft night. A second startable quarterback is worth more here than a third receiver, and whoever works that out at pick forty instead of pick ninety will spend October looking clever.',
      },
      { type: 'heading', text: 'Seeding, and how ties actually break' },
      {
        type: 'paragraph',
        text: 'Head-to-head record breaks a tie before points for. Practically: a win over the team you are level with in December is worth more than the forty points you hung on somebody in September. Remember that in week eleven, when a matchup looks meaningless.',
      },
      {
        type: 'quote',
        text: 'Every league has one manager who checks the standings on Tuesday morning. This year there will be twelve.',
      },
      {
        type: 'paragraph',
        text: 'The draft is Thursday. After that the scoreboard stops being hypothetical, and this page stops being an introduction.',
      },
    ],
  },
]

/**
 * Newest first, by the date it was actually published.
 *
 * ⚠️ SORT ON `publishedAt`, NOT ON WEEK AND SERIES. The first version ordered
 * by week and then broke ties alphabetically on the series name, with a comment
 * claiming Monday's preview would sort BELOW Tuesday's recap. It does the
 * opposite: `'miracles'.localeCompare('recap')` is negative, so the Monday
 * preview led the archive and the lead-story slot showed the older piece.
 *
 * A date is the only thing that actually means "most recent", and it keeps
 * meaning that for any series added later without anybody having to remember a
 * rule about alphabetical order. `week` is the tiebreak for two posts sharing a
 * date; beyond that, declaration order wins, and new entries go on top.
 */
export const publishedRecaps = (): Recap[] =>
  RECAPS.filter((r) => r.published)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.week - a.week)

export const seriesOf = (r: Recap): Series => r.series ?? 'recap'

export const recapBySlug = (slug: string): Recap | null =>
  RECAPS.find((r) => r.slug === slug && r.published) ?? null

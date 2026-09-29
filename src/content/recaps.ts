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
  /** Left unset while the prediction is still live. */
  verdict?: 'correct' | 'wrong' | 'partial'
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
      },
      {
        id: 'justin-wins-one',
        claim: 'Justin wins a game in week 4. He is too good to be 0-4.',
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
        text: 'On the New York side: Jaxson Dart took a hit to his left knee on the opening drive and did not return — initial exams point to a sprained MCL — and Malik Nabers left in the first quarter with a shoulder problem, returned, and finished with one catch for one yard. That is the medical report. It is not funny and I am not going to make it funny.',
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
        text: 'The defending champions opened their title defense, and Sam Darnold’s afternoon lasted five snaps before a hip injury ended it. Drew Lock came in, went 16 of 22 for 187 and a score, and Seattle ground out thirteen unanswered. No timetable on Darnold. That is the entire medical report, it is not funny, and I am not going to make it funny.',
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

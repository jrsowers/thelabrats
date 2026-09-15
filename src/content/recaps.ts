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
   * The week's results. A real block rather than prose, because six scores
   * written as sentences is a wall of numbers nobody parses — week 1 shipped
   * them that way and they were unreadable. Winner first in each row.
   */
  | { type: 'scoreboard'; rows: ScoreboardRow[] }

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
  winner: string
  winnerScore: number
  loser: string
  loserScore: number
}

export interface Recap {
  /** URL segment: /recaps/<slug> */
  slug: string
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
          { winner: 'Mr. Anderson', winnerScore: 197.4, loser: 'Dad Bod', loserScore: 148.9 },
          { winner: 'Da Reigning Champ', winnerScore: 166.0, loser: 'Tyler’s Talented Team', loserScore: 153.3 },
          { winner: 'Nobody Knows', winnerScore: 150.7, loser: 'Substation Superstars', loserScore: 81.2 },
          { winner: 'Bree’s Badass Boys', winnerScore: 124.4, loser: 'All Bark, All Bite', loserScore: 119.9 },
          { winner: 'Nix Pix a Puka Six', winnerScore: 118.1, loser: 'Burrow My Burden', loserScore: 102.4 },
          { winner: 'PKM Playmakers', winnerScore: 114.0, loser: 'Soft Tissue Issues', loserScore: 111.5 },
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

export const publishedRecaps = (): Recap[] =>
  RECAPS.filter((r) => r.published).sort((a, b) => b.week - a.week)

export const recapBySlug = (slug: string): Recap | null =>
  RECAPS.find((r) => r.slug === slug && r.published) ?? null

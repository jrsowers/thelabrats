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
        text: 'Conditions were perfect. Every variable in the experiment was screaming in your favor. A trained monkey with a coin clears a hundred and ten.',
      },
      { type: 'paragraph', text: 'God, I love this job.' },
      { type: 'heading', text: 'BEARS 59, PANTHERS 37 — Somebody Left The Gas On' },
      {
        type: 'paragraph',
        text: 'Ninety-six combined points, the highest-scoring Week 1 game the NFL has ever staged, and a defensive coordinator somewhere is currently updating a résumé in a parked car.',
      },
      {
        type: 'paragraph',
        text: 'Caleb Williams threw for 269 and two scores, ran for 65 and two more, and spent four quarters conducting himself like a man who had read every word ever written about him and elected to respond in the form of a war crime. Bryce Young answered with 361 yards, three passing touchdowns and a rushing one — the best game of his career, a genuine masterpiece, and he lost by twenty-two. D’Andre Swift: 124 and three. Kyle Monangai: a hundred more, including a 61-yard sprint the Carolina defense observed from a respectful distance, the way you would watch a house fire.',
      },
      {
        type: 'paragraph',
        text: 'Four managers in this league had a stake in that football game.',
      },
      { type: 'paragraph', text: 'Two of them played it correctly.' },
      {
        type: 'paragraph',
        text: 'Jesse started Caleb Williams and banked 41.3, the largest single-player number in the league. Tyler started D’Andre Swift and banked 31.9. Chenell then watched Monangai post 19.4 from the bench. Jesse watched Chuba Hubbard post 22.2 from the bench. And Tyler — Tyler we are going to handle separately, at length, and without mercy.',
      },
      { type: 'heading', text: 'RAVENS 41 — Chenell Has Purchased The City Of Baltimore' },
      {
        type: 'paragraph',
        text: 'Derrick Henry went for 144 yards and three touchdowns and moved past Marcus Allen on the all-time list, because at this stage of his career the man is less a running back than a geological event. Baltimore put 31 on the board before halftime. Isaiah Likely got his.',
      },
      {
        type: 'paragraph',
        text: 'Both of them belong to Chenell.',
      },
      {
        type: 'paragraph',
        text: 'Let me be precise about what has happened here. The reigning champion did not draft a fantasy football team. The reigning champion acquired commercial real estate in Maryland and is collecting rent on it every Sunday. Henry and Likely combined for 58.6 of a 166.0. Eleven of you drafted players. Chenell drafted a municipality.',
      },
      { type: 'heading', text: 'SEAHAWKS 13, PATRIOTS 10 — Five Snaps' },
      {
        type: 'paragraph',
        text: 'The defending champions opened their title defense, and Sam Darnold’s afternoon lasted five snaps before a hip injury ended it. Drew Lock came in, went 16 of 22 for 187 and a score, and Seattle ground out thirteen unanswered to win a rock fight. No timetable on Darnold. That is the entire medical report, it is not funny, and I am not going to make it funny.',
      },
      {
        type: 'paragraph',
        text: 'What is funny — the single funniest object on my desk this morning — is that a manager in this league looked at a superflex slot, weighed their options like a serious person, and started that man anyway.',
      },
      {
        type: 'paragraph',
        text: 'Zero point five points. I ran the sample through the centrifuge three times. It keeps separating into a rounding error and a small quantity of regret.',
      },
      {
        type: 'paragraph',
        text: 'Hold that thought. I will need it in about four hundred words, and I am going to enjoy it.',
      },
      { type: 'heading', text: 'BENGALS 33, BUCCANEERS 27 — Two Catches' },
      {
        type: 'paragraph',
        text: 'Cincinnati won a shootout. Ja’Marr Chase, the best wide receiver currently drawing breath, was targeted four times, caught two of them, and finished with twelve receiving yards — his quietest afternoon since November of 2023. Tampa Bay bracketed him for sixty minutes and dared literally anybody else to beat them. Literally anybody else beat them.',
      },
      { type: 'paragraph', text: 'James started Ja’Marr Chase.' },
      { type: 'paragraph', text: 'James received 2.2 points.' },
      { type: 'paragraph', text: 'James lost by 2.6.' },
      {
        type: 'paragraph',
        text: 'I am not going to insult a room full of adults by connecting those three sentences. I am going to leave them stacked exactly where they are, like a body.',
      },
      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'Regrettably, a portion of my funding is contingent on bookkeeping. Six results, briskly, and then back to the autopsies.',
      },
      {
        type: 'paragraph',
        text: 'Mr. Anderson 197.4, Dad Bod 148.9. Da Reigning Champ 166.0, Tyler’s Talented Team 153.3. Nobody Knows 150.7, Substation Superstars 81.2.',
      },
      {
        type: 'paragraph',
        text: 'Bree’s Badass Boys 124.4, All Bark All Bite 119.9. Nix Pix a Puka Six 118.1, Burrow My Burden 102.4. PKM Playmakers 114.0, Soft Tissue Issues 111.5.',
      },
      {
        type: 'stat',
        label: 'The spread, week one',
        value: '197.4 down to 81.2',
        note: 'A 116.2-point gap between the best and worst lineups in a twelve-team league. In a normal season that is a December outlier. This week it was a Sunday.',
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
        text: 'Jesse’s best legal lineup was worth 238.2. Christian Watson put up 29.7 in a folding chair. Chuba Hubbard put up 22.2 in the chair beside him. Arrange the right names in the right slots and that roster beats the highest score anybody in this league produced all week — by forty points.',
      },
      {
        type: 'paragraph',
        text: 'The Bench Bum is supposed to be a participation ribbon for somebody who lost badly and knows exactly why. Jesse won by 48.6 and earned it anyway. That is a brand new specimen and I am naming it after them.',
      },
      {
        type: 'paragraph',
        text: 'Congratulations, Jesse. You are the most talented manager in this league and you are leaving money on the table like a tourist.',
      },
      { type: 'heading', text: 'Tyler Benched The Answer And I Will Not Be Letting This Go' },
      {
        type: 'paragraph',
        text: 'Here is the thought I asked you to hold.',
      },
      {
        type: 'paragraph',
        text: 'Tyler’s Talented Team scored 153.3. That is the second-highest total in the entire league. Drop that number into four of the six matchups played this week and Tyler wins comfortably, opens 1-0, and none of us ever discusses it again.',
      },
      { type: 'paragraph', text: 'Tyler drew the champion. Tyler lost by 12.7.' },
      {
        type: 'paragraph',
        text: 'And now the flush. The beautiful, ruinous, career-defining flush.',
      },
      { type: 'paragraph', text: 'The quarterback Tyler started scored 0.5.' },
      { type: 'paragraph', text: 'The quarterback Tyler benched scored 38.4.' },
      {
        type: 'paragraph',
        text: 'Bryce Young spent the highest-scoring football game in the history of Week 1 throwing for 361 yards and three scores and running in a fourth — all of it, every single point, from a folding chair on Tyler’s bench. Thirty-seven point nine points of daylight between two names in two boxes. One click. That is the whole distance between 1-0 and this paragraph.',
      },
      {
        type: 'paragraph',
        text: 'This is a superflex league. It has been a superflex league since before any of you opened a draft board. The OP slot is not a decorative element, it is not a polite suggestion, and it is not there to hold your feelings.',
      },
      {
        type: 'paragraph',
        text: 'Tyler will win ten games this season. Tyler will also lie awake in February thinking about a folding chair.',
      },
      { type: 'heading', text: 'Colin Did All The Work And Then Refused To Collect' },
      {
        type: 'paragraph',
        text: 'Full credit, sincerely, no notes: Colin identified Stefon Diggs as the best available free agent, spent the claim, cut Travis Hunter to clear the spot, and watched Diggs deliver 13.5 against a 7.5 projection. That is the entire waiver wire process executed flawlessly. That is a manager doing homework on a Tuesday night while the rest of you were asleep.',
      },
      { type: 'paragraph', text: 'Colin then benched him.' },
      {
        type: 'paragraph',
        text: 'Diggs sat. Beside him sat Tyler Shough, who scored 33.2. Those two combined for 46.7 points — roughly forty percent of everything Colin actually started — and Colin won the matchup by 15.7 regardless, which is the most infuriating detail in this entire document.',
      },
      {
        type: 'paragraph',
        text: 'There is a version of this league in which Colin is genuinely frightening. It requires Colin to take Colin’s advice. Until then we have a manager who does the reading, shows the work, arrives at the correct answer, and puts it in a display case to admire through the glass.',
      },
      { type: 'heading', text: 'The Champ Was Down 46.7 And Did Not Break A Sweat' },
      {
        type: 'paragraph',
        text: 'At some point during the Sunday afternoon window, Chenell was trailing by 46.7 points. That is not a deficit. That is a diagnosis.',
      },
      { type: 'paragraph', text: 'Final: 166.0 to 153.3.' },
      {
        type: 'paragraph',
        text: 'The reigning champion opens 1-0 having spent most of an afternoon losing, which is precisely the flavor of week that makes a title defense feel less like a competition and more like a weather system. One week in and the crown is already doing structural damage to eleven people’s self-esteem.',
      },
      {
        type: 'paragraph',
        text: 'Somebody intervene before this becomes a documentary.',
      },
      { type: 'heading', text: 'Doug Played A Perfect Game Against Somebody Who Was Asleep' },
      {
        type: 'paragraph',
        text: 'Nobody Knows scored 150.7. The best lineup Doug’s roster could legally field also scored 150.7. Not a point misplaced. Not a start to revisit. Justin Jefferson 27.2, Ashton Jeanty 29.7, and every last decision correct on the first attempt.',
      },
      { type: 'paragraph', text: 'Doug won by 69.5.' },
      {
        type: 'paragraph',
        text: 'Doug could have benched three starters at random, gone outside for the afternoon, and still won by thirty.',
      },
      {
        type: 'paragraph',
        text: 'The one manager who got every call right is the one manager who needed none of them. I have stared at this for an hour and cannot decide whether it is the most impressive thing on the page or the cruelest.',
      },
      { type: 'heading', text: 'The Trade Where Everybody Won And Everybody Lost' },
      {
        type: 'paragraph',
        text: 'On the fourth of September, Justin sent Trevor Lawrence and Rome Odunze to James for Brock Purdy and MarShawn Lloyd. Clean. Two for two. Adults negotiating in good faith, which in this league is itself a minor scandal.',
      },
      {
        type: 'paragraph',
        text: 'Week one: Purdy scored 28.1 for Justin, Lawrence 34.1 for James. Both quarterbacks showed up. Both halves of the deal did exactly what they were built to do.',
      },
      {
        type: 'paragraph',
        text: 'Justin then posted 81.2, the lowest total in the league, and lost by 69.5. James then lost by 2.6 because the best receiver in football caught two passes for twelve yards.',
      },
      {
        type: 'paragraph',
        text: 'Two managers made a good trade and the universe billed them both for it anyway. Get it framed.',
      },
      { type: 'heading', text: 'The Rest Of The Petri Dish' },
      {
        type: 'paragraph',
        text: 'Mike won the closest game of the week, by 2.6, with the week’s lowest winning score, 114.0 — of which Jaxson Dart was 32.6. Twenty-nine percent of a victory, delivered by one rookie quarterback. Three awards for an afternoon of doing the absolute bare minimum with surgical precision. The Cat Burglar takes only what the job requires and is out the window before the lights come on. It is not pretty and it is 1-0.',
      },
      {
        type: 'paragraph',
        text: 'Bree finished 4.3 off their projection and won by 4.5, the most Bree result available to modern science, and I mean that as a compliment to nobody’s entertainment value. Kenneth Walker 32.6, Jalen Hurts 30.7, and Kirk Cousins posting 21.8 on the bench — a public service announcement that this league has more startable quarterbacks than places to start them.',
      },
      {
        type: 'paragraph',
        text: 'Keshia lost by 4.5 with a lineup running from Jordan Love at 24.5 down to Matthew Stafford at 5.1 — a spread of 19.4, the flattest in the league. Everybody chipped in, nobody carried, and the whole thing had the energy of a group project. The Steelers defense turned in 21.0, the best D/ST performance in the league: a lovely thing to own and a deeply upsetting thing to need.',
      },
      {
        type: 'paragraph',
        text: 'Jay made six roster moves — three free agents, one lineup change, two trips to injured reserve — and posted 148.9, a number that beats seven of the other eleven teams in this league. Jay drew the 197.4. There is no lesson here. Sometimes you do everything right and the experiment kills you anyway.',
      },
      {
        type: 'paragraph',
        text: 'And Evan, whose quarterback’s Minnesota debut ended early and took the afternoon with it, posted 102.4 and lost by 15.7. Some variables are simply not yours to control. We will collect a cleaner sample next week.',
      },
      { type: 'heading', text: 'THE FINDINGS' },
      {
        type: 'paragraph',
        text: 'One week. Twelve subjects. A scoring environment that broke a record older than most of this room, and a table in which the highest scorer left forty points in a folding chair, the second-highest scorer lost, and the perfect lineup won by a margin that made perfection irrelevant.',
      },
      {
        type: 'paragraph',
        text: 'Now the hot takes, delivered with the absolute confidence of a man holding no evidence whatsoever.',
      },
      {
        type: 'paragraph',
        text: 'Chenell does not lose in September. Print it. Pin it to something. Bring it back to me in three weeks when I am wrong and I will eat the page on camera.',
      },
      {
        type: 'paragraph',
        text: 'Jesse has the most dangerous roster in this league and is, at present, its second-most dangerous manager.',
      },
      {
        type: 'paragraph',
        text: 'And Tyler’s 153.3 will finish the season as the highest losing score anybody posts, which is the sort of record that follows a person to a funeral.',
      },
      {
        type: 'paragraph',
        text: 'Check your lineups. Play your quarterbacks. Somebody please tell Colin that a bench is not a display case.',
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
        text: 'The Lab Rats enter their second season with the same twelve managers and one meaningful difference: Chenell Basilio is defending something now. Last year they were another name in the table. This year their avatar has a crown on it, and the other eleven teams have spent an offseason thinking about how to take it off.',
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

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
      'The NFL played its highest-scoring opening Sunday in the history of the sport. The Lab Rats answered with a 197, an 81, and a manager who found the right receiver on waivers and then refused to play him.',
    publishedAt: '2026-09-15',
    published: true,
    coverImage: '/recaps/week-1.jpg',
    coverAlt:
      'A lone football player silhouetted against stadium floodlights in heavy rain.',
    author: BURNER,
    body: [
      {
        type: 'paragraph',
        text: 'Subjects. Colleagues. Unwitting participants. The results are in, and I have not slept.',
      },
      {
        type: 'paragraph',
        text: 'The National Football League just played the highest-scoring opening Sunday in the recorded history of the sport. Six games cleared sixty combined points. One of them cleared ninety-six. Somewhere in a league office, an actuary is lying down.',
      },
      {
        type: 'paragraph',
        text: 'And in this laboratory, on that same afternoon, under those same conditions, one of you scored eighty-one.',
      },
      { type: 'paragraph', text: 'Science is beautiful.' },

      { type: 'heading', text: 'BEARS 59, PANTHERS 37 — The Experiment Escaped The Beaker' },
      {
        type: 'paragraph',
        text: 'Ninety-six combined points. The highest-scoring Week 1 game the NFL has ever staged. Caleb Williams threw for 269 and two scores, ran for 65 and two more, and generally conducted himself like a man who had read the scouting report on himself and decided to file an objection. Bryce Young answered with 361 yards, three passing touchdowns and a rushing one, which in any other week is the story of the week and in this one is a footnote in a twenty-two point loss.',
      },
      {
        type: 'paragraph',
        text: 'D\'Andre Swift ran for 124 and three. Kyle Monangai added a hundred more, including one 61-yard sprint that nobody on the Carolina sideline attempted to contest. Four managers in this league had a stake in that football game.',
      },
      { type: 'paragraph', text: 'Two of them played it correctly.' },
      {
        type: 'paragraph',
        text: 'Jesse started Caleb Williams and collected 41.3, the highest single-player score in the league. Tyler started D\'Andre Swift and collected 31.9. Chenell watched Monangai post 19.4 from the bench. Jesse watched Chuba Hubbard post 22.2 from the same place, which is a sentence we will be returning to shortly, and at length.',
      },

      { type: 'heading', text: 'RAVENS 41 — Chenell Has Simply Bought Baltimore' },
      {
        type: 'paragraph',
        text: 'Derrick Henry went for 144 yards and three touchdowns and moved past Marcus Allen on the all-time list, because of course he did. The Ravens put 31 on the board before halftime. Isaiah Likely got his.',
      },
      {
        type: 'paragraph',
        text: 'Both of them belong to Chenell, who did not so much draft a fantasy team as purchase season tickets in Maryland and expense them to the league. Henry and Likely combined for 58.6 of the 166.0 that won the reigning champion their opener. The other eleven of you drafted players. Chenell drafted a zip code.',
      },

      { type: 'heading', text: 'SEAHAWKS 13, PATRIOTS 10 — Five Snaps' },
      {
        type: 'paragraph',
        text: 'The defending Super Bowl champions opened the season, and Sam Darnold\'s afternoon lasted five snaps before a hip injury ended it. Drew Lock came in, went 16 of 22 for 187 and a score, and Seattle ran off thirteen unanswered to win a rock fight. No timetable on Darnold. That is the whole medical report and I will leave it there.',
      },
      {
        type: 'paragraph',
        text: 'The fantasy consequence, however, is fair game, and the fantasy consequence is that Tyler started Sam Darnold in the superflex and received half a point. Zero point five. I have run the sample three times through the centrifuge and it keeps coming back as a rounding error.',
      },
      {
        type: 'paragraph',
        text: 'Hold that thought. We will need it in about four hundred words.',
      },

      { type: 'heading', text: 'BENGALS 33, BUCCANEERS 27 — Two Catches' },
      {
        type: 'paragraph',
        text: 'Cincinnati won a shootout. Ja\'Marr Chase, the best receiver alive by acclamation, was targeted four times, caught two of them, and finished with twelve receiving yards — his quietest game since November of 2023. Tampa Bay bracketed him all afternoon and dared everyone else to beat them. Everyone else beat them.',
      },
      {
        type: 'paragraph',
        text: 'James started Ja\'Marr Chase. James received 2.2 points. James lost by 2.6.',
      },
      {
        type: 'paragraph',
        text: 'I am not going to insult a room of intelligent adults by drawing the line between those three sentences.',
      },

      { type: 'heading', text: 'THE SCOREBOARD' },
      {
        type: 'paragraph',
        text: 'Regrettably, part of my job is bookkeeping. Six results, and then we return to the interesting part.',
      },
      {
        type: 'paragraph',
        text: 'Mr. Anderson 197.4, Dad Bod 148.9. Da Reigning Champ 166.0, Tyler\'s Talented Team 153.3. Nobody Knows 150.7, Substation Superstars 81.2.',
      },
      {
        type: 'paragraph',
        text: 'Bree\'s Badass Boys 124.4, All Bark All Bite 119.9. Nix Pix a Puka Six 118.1, Burrow My Burden 102.4. PKM Playmakers 114.0, Soft Tissue Issues 111.5.',
      },
      {
        type: 'stat',
        label: 'The spread, week one',
        value: '197.4 down to 81.2',
        note: 'A 116.2-point gap between the best and worst lineups in a twelve-team league. In a normal week that is a season-defining outlier. This week it was Sunday.',
      },

      { type: 'heading', text: 'Jesse Scored 197 And Still Got Roasted By The Machine' },
      {
        type: 'paragraph',
        text: 'Mr. Anderson posted 197.4, which is 31.4 clear of the next-best team in the league and more than double what the last-place lineup managed. Caleb Williams 41.3. Josh Allen 39.7. David Montgomery 27.4 against an 11.7 projection. It was, by every measure the scoreboard understands, a masterpiece.',
      },
      {
        type: 'paragraph',
        text: 'The optimizer disagrees. Jesse\'s best legal lineup was worth 238.2. Christian Watson put up 29.7 on the bench. Chuba Hubbard put up 22.2 next to him. Swap the right names into the right slots and that roster was 40.8 points better than the best score anybody in this league produced all week.',
      },
      {
        type: 'paragraph',
        text: 'The Bench Bum is supposed to be a consolation prize for a manager who lost badly and knows exactly why. Jesse won by 48.6 and earned it anyway. That is a new specimen, and I am naming it after them.',
      },
      {
        type: 'quote',
        text: 'The hypothesis was sound. The methodology was rigorous. The subject won by forty-nine and left an entire second team on the table.',
      },

      { type: 'heading', text: 'Tyler Lost The Best Game Of The Week By Benching The Answer' },
      {
        type: 'paragraph',
        text: 'Here is the thought I asked you to hold. Tyler\'s Talented Team scored 153.3 on Sunday. That is the second-highest total in the entire league. In four of the six matchups this week, 153.3 wins comfortably and nobody ever discusses it again.',
      },
      { type: 'paragraph', text: 'Tyler drew the champion, and lost by 12.7.' },
      {
        type: 'paragraph',
        text: 'And the flush, the beautiful, ruinous flush, is this: the quarterback Tyler started went for 0.5, and the quarterback Tyler benched went for 38.4. Bryce Young spent the highest-scoring game in Week 1 history throwing for 361 yards and three scores and running in a fourth, all of it from a folding chair on this roster.',
      },
      {
        type: 'paragraph',
        text: 'Thirty-seven point nine points of difference between two names in two boxes. This is a superflex league. It has been a superflex league since before any of you drafted. The OP slot is not decorative.',
      },
      {
        type: 'paragraph',
        text: 'Tyler will win ten games this year. Tyler will also think about this in February.',
      },

      { type: 'heading', text: 'Colin Solved The Waiver Wire And Then Refused To Act On It' },
      {
        type: 'paragraph',
        text: 'Full credit where it is due. Colin identified Stefon Diggs as the week\'s best available free agent, spent the claim, cut Travis Hunter to make room, and watched Diggs deliver 13.5 against a 7.5 projection. That is the whole waiver wire process executed correctly. That is a manager doing their homework.',
      },
      { type: 'paragraph', text: 'Colin then benched him.' },
      {
        type: 'paragraph',
        text: 'Diggs sat. Beside him sat Tyler Shough, who scored 33.2. Those two bench players combined for 46.7 points, which is roughly forty percent of everything Colin actually started, and Colin won the matchup by 15.7 regardless, which is the most infuriating detail of the entire thing.',
      },
      {
        type: 'paragraph',
        text: 'There is a version of this league where Colin is terrifying. It requires Colin to take Colin\'s advice.',
      },

      { type: 'heading', text: 'The Champ Was Down 46.7 And Never Looked Concerned' },
      {
        type: 'paragraph',
        text: 'At some point during the Sunday afternoon slate, Chenell was trailing Tyler by 46.7 points. Forty-six point seven. That is not a deficit, that is a diagnosis.',
      },
      {
        type: 'paragraph',
        text: 'Final: 166.0 to 153.3. The reigning champion opens 1-0 having spent most of an afternoon losing, which is precisely the kind of week that makes a title defense feel inevitable and makes eleven other managers feel unwell. We are one week in and the crown is already doing damage to morale.',
      },
      {
        type: 'paragraph',
        text: 'Somebody take this seriously before October.',
      },

      { type: 'heading', text: 'Doug Ran A Perfect Lineup And It Was Not Remotely Necessary' },
      {
        type: 'paragraph',
        text: 'Nobody Knows scored 150.7. The best possible lineup Doug\'s roster could legally produce also scored 150.7. Not a point misplaced. Not a start to revisit. Justin Jefferson for 27.2, Ashton Jeanty for 29.7, and every other decision correct on the first attempt.',
      },
      {
        type: 'paragraph',
        text: 'Doug won by 69.5, and could have benched three starters at random and still won by thirty. The one manager who got every single call right is also the one manager who did not need to get a single one of them right. I have been staring at this result for an hour and I remain unable to decide whether it is impressive or cruel.',
      },

      { type: 'heading', text: 'The Trade That Worked Perfectly For Nobody' },
      {
        type: 'paragraph',
        text: 'On the fourth of September, Justin sent Trevor Lawrence and Rome Odunze to James for Brock Purdy and MarShawn Lloyd. A clean two-for-two between adults. Nobody got fleeced.',
      },
      {
        type: 'paragraph',
        text: 'In week one, Brock Purdy scored 28.1 for Justin. Trevor Lawrence scored 34.1 for James. Both quarterbacks showed up. Both sides of the deal did exactly what they were supposed to do.',
      },
      {
        type: 'paragraph',
        text: 'Justin then scored 81.2, the lowest total in the league, and lost by 69.5. James then lost by 2.6 because the best receiver in football caught two passes for twelve yards.',
      },
      {
        type: 'paragraph',
        text: 'Two managers made a good trade. The universe charged them both for it anyway. Frame that one.',
      },

      { type: 'heading', text: 'The Rest Of The Petri Dish' },
      {
        type: 'paragraph',
        text: 'Mike won the closest game of the week by 2.6 with the lowest winning score of the week, 114.0, of which Jaxson Dart was 32.6 — twenty-nine percent of a victory, produced by one rookie quarterback in the OP slot. Three awards for one afternoon of doing the bare minimum with maximum precision. The Cat Burglar takes only what the job requires and is gone before anybody notices.',
      },
      {
        type: 'paragraph',
        text: 'Bree finished 4.3 away from their projection and won by 4.5, which is the single most Bree result imaginable and I mean that as a compliment to nobody\'s entertainment value. Kenneth Walker 32.6, Jalen Hurts 30.7, and Kirk Cousins putting up 21.8 on the bench as a reminder that this league has more startable quarterbacks than starting spots.',
      },
      {
        type: 'paragraph',
        text: 'Keshia lost by 4.5 with a lineup that ran from Jordan Love at 24.5 down to Matthew Stafford at 5.1, a spread of 19.4 that was the tightest in the league. Everybody contributed. Nobody carried. The Steelers defense went for 21.0, the best D/ST performance in the league — a fine thing to own and a strange thing to need.',
      },
      {
        type: 'paragraph',
        text: 'Jay made six roster moves — three free agents, one lineup change, two trips to injured reserve — and scored 148.9, a total that beats seven of the other eleven teams in this league. Jay drew the 197.4. There is no lesson here. Sometimes the experiment is just fatal.',
      },
      {
        type: 'paragraph',
        text: 'And Evan, whose quarterback\'s Minnesota debut ended early and took the afternoon with it, scored 102.4 and lost by 15.7. Some weeks the variables are simply not yours to control. We will collect a cleaner sample next Sunday.',
      },

      { type: 'heading', text: 'The Findings' },
      {
        type: 'paragraph',
        text: 'One week of data. Twelve subjects. A league-wide scoring environment that broke a record set before most of you were alive, and a league table in which the highest scorer left forty points on the bench, the second-highest scorer lost, and the manager with the perfect lineup won by a margin that made perfection irrelevant.',
      },
      {
        type: 'paragraph',
        text: 'I am calling it now, loudly, with the confidence of a man holding no evidence whatsoever: Chenell does not lose in September. Print it. Pin it up. Bring it back to me in three weeks when I am wrong and I will eat the page on camera.',
      },
      {
        type: 'paragraph',
        text: 'Check your lineups. Play your quarterbacks. Somebody please tell Colin that a bench is not a display case.',
      },
      { type: 'paragraph', text: 'The lab is open. Week two begins Thursday.' },
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

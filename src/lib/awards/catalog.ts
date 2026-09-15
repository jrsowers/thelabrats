/**
 * The full award library.
 *
 * Every award declares what it MEASURES and what DATA it needs. That second
 * field is the honest part: seven of these compute from final scores today, and
 * thirteen cannot exist until player-level scoring does. Declaring the
 * dependency keeps the gap visible instead of letting an award quietly go
 * missing (§22.2, §22.8).
 *
 * `formula` is the documented definition the spec requires — it is what the
 * implementation must match, and what a manager can be shown when they ask why
 * they won something.
 */

export type AwardSection = 'STUDS' | 'DUDS'

/**
 * What kind of thing the award is really about. Drives display order within a
 * section: manager judgement first, then how a matchup went, then individual
 * performances.
 */
export type AwardCategory = 'MANAGER' | 'MATCHUP' | 'PLAYER'

export const CATEGORY_ORDER: AwardCategory[] = ['MANAGER', 'MATCHUP', 'PLAYER']

/**
 * How often data must be captured for an award to be computable.
 *
 * This is the dimension that decides storage cost, and it is mostly independent
 * of which fields an award reads. Nineteen of twenty awards need at most TWO
 * captures a week; only one needs a continuous record.
 */
export type CaptureCadence =
  /** Final team scores. Already captured by the routine sync. */
  | 'FINAL_ONLY'
  /** One boxscore pull after Monday night: player scores and lineup slots. */
  | 'WEEKLY_BOXSCORE'
  /** One projections pull before Thursday kickoff. */
  | 'PREGAME_PROJECTION'
  /** Minute-by-minute snapshots throughout the games. */
  | 'CONTINUOUS'

export const CADENCE_LABEL: Record<CaptureCadence, string> = {
  FINAL_ONLY: 'Final scores only',
  WEEKLY_BOXSCORE: 'One boxscore pull per week',
  PREGAME_PROJECTION: 'One projections pull per week',
  CONTINUOUS: 'Continuous in-game capture',
}

/** What a given award needs before it can be computed for real. */
export type DataNeed =
  | 'FINAL_SCORES'      // available now
  | 'PLAYER_SCORES'     // needs player_week_scores — week 1
  | 'PROJECTIONS'       // needs ESPN projections on live matchups
  | 'LINEUP_OPTIMIZER'  // needs player scores + slot eligibility
  | 'TRANSACTIONS'      // needs real transaction history
  | 'LIVE_EVENTS'       // Phase 2: snapshots and win probability

export interface AwardDef {
  key: string
  name: string
  section: AwardSection
  category: AwardCategory
  /** One line, shown on the card. */
  blurb: string
  /** The documented calculation (§22.8). */
  formula: string
  needs: DataNeed[]
  /** Label for the card's headline number. */
  metricLabel: string
  /** The headline number carries a sign and a colour. See ComputedAward.metricTone. */
  signedMetric?: boolean
  /** Heaviest capture cadence this award depends on. */
  capture: CaptureCadence
  /**
   * What is shown as the reason for the award, beneath the recipient.
   * A Stud is always won by a manager; the player or matchup is the evidence.
   */
  evidence?: 'PLAYER' | 'MATCHUP'
  /** Awards about a single player rather than a team. */
  player?: boolean
}

export const AWARDS: AwardDef[] = [
  // ---------------- STUDS ----------------
  // Every award is won by a MANAGER. Where a player or a matchup drives the
  // result, it is shown beneath as evidence rather than as the recipient.
  {
    key: 'mastermind', name: 'The Mastermind', section: 'STUDS', category: 'MANAGER',
    // ⚠️ NOT "fewest points on the bench", which is what this said until
    // 2026-09-15. The number is the gap to the best LEGAL lineup, so a manager
    // whose bench scored 20 can still sit at zero — none of those twenty
    // points were reachable from a slot those players were eligible for.
    blurb: 'Started their most optimal lineup this week.',
    formula: 'Smallest gap between actual starter points and the highest-scoring legal lineup. Needs a slot-aware optimizer — greedy bench substitution is wrong in a superflex league, where the OP slot competes with QB for the same players.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left behind',
  },
  {
    key: 'waiver_wire_wizard', name: 'The Waiver Wire Wizard', section: 'STUDS', category: 'MANAGER',
    blurb: 'Grabbed the highest scoring free agent.',
    formula: 'Highest score by a player acquired from waivers or free agency this week, credited to the manager who claimed them.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points from the pickup', evidence: 'PLAYER',
  },
  {
    key: 'nostradamus', name: 'Fantasy Nostradamus', section: 'STUDS', category: 'MANAGER',
    blurb: 'Had the player that exceeded projections the most.',
    formula: 'Largest actual-minus-projected among started players, credited to the manager who started them.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Over projection', evidence: 'PLAYER',
  },
  {
    key: 'cat_burglar', name: 'The Cat Burglar', section: 'STUDS', category: 'MANAGER',
    blurb: 'Had the lowest score of any matchup winner.',
    formula: 'Lowest team score among winning teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a win', evidence: 'MATCHUP',
  },
  {
    key: 'giant_killer', name: 'The Giant Killer', section: 'STUDS', category: 'MANAGER',
    blurb: 'Overcame the biggest projected deficit. (Pre-game)',
    // The mirror image of The Choke Artist: same matchup, opposite manager.
    formula: 'Largest pregame projected deficit that still ended in a win.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Projected deficit', evidence: 'MATCHUP',
  },
  {
    key: 'prime_specimen', name: 'The Prime Specimen', section: 'STUDS', category: 'MANAGER',
    blurb: 'Started the highest scoring player this week.',
    formula: 'Highest-scoring started player, credited to the manager who started them.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points', evidence: 'PLAYER',
  },
  {
    key: 'control_group', name: 'The Control Group', section: 'STUDS', category: 'MANAGER',
    blurb: 'Scored almost exactly what the projections said.',
    // The only award in the library that is not about an extreme. It exists
    // because every other one measures who scored a lot or a little, which is
    // why the same three managers kept collecting all of them.
    formula: 'Smallest gap between a team\'s starter points and the sum of those starters\' projections, in either direction.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Off projection',
    signedMetric: true,
  },
  {
    key: 'photo_finish', name: 'The Photo Finish', section: 'STUDS', category: 'MATCHUP',
    blurb: 'Survived the closest game of the week.',
    formula: 'Narrowest winning margin of the week, credited to the manager who survived it.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Margin of victory', evidence: 'MATCHUP',
  },
  {
    key: 'socialist', name: 'The Socialist', section: 'STUDS', category: 'MANAGER',
    blurb: 'The most evenly spread lineup in the league.',
    // Measured on the FLOOR, not on how flat the distribution was. Share of
    // team total put five of twelve managers inside a single percentage point
    // of each other and handed the award to whoever happened to score most —
    // see the note in compute.ts.
    formula: 'Smallest margin between a team\'s best-scoring starter and its worst. Measures how EVENLY a lineup scored, not how well — a flat bad week qualifies, which is The Dumpster Fire\'s business rather than this award\'s.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Best-to-worst margin',
  },
  {
    key: 'one_man_army', name: 'The One Man Army', section: 'STUDS', category: 'MANAGER',
    blurb: 'One player did the heavy lifting.',
    // WINNERS ONLY. Across the whole league this lands on the lowest scorer
    // every week, because a small total makes every slice look big — week 1
    // would have given it to the team that also took The Dumpster Fire.
    formula: 'Largest share of a team\'s starter points contributed by a single player, among managers who WON their matchup.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Share of team', evidence: 'PLAYER',
  },
  {
    key: 'slay_girl_slay', name: 'Slay Girl Slay', section: 'STUDS', category: 'MANAGER',
    blurb: 'Nearly the whole lineup beat its projection.',
    formula: 'Most started players who finished above their own projection. Ties broken by the total amount cleared.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Overperforming starters',
  },
  {
    key: 'sweatin_it_out', name: 'Sweatin\' It Out', section: 'STUDS', category: 'MATCHUP',
    blurb: 'Was down big. Came back and won anyway.',
    // The one award that needs the continuous record. Defined as the largest
    // deficit ever faced rather than "behind going into Monday night", so it
    // needs no calendar arithmetic and tells a better story besides.
    formula: 'Largest deficit a team ever faced in its matchup and still won, measured across every in-game snapshot.',
    needs: ['LIVE_EVENTS'], capture: 'CONTINUOUS',
    metricLabel: 'Deficit erased', evidence: 'MATCHUP',
  },

  // ---------------- DUDS ----------------
  // Also all manager awards. Where a matchup outcome is the subject, the award
  // belongs to the manager it happened TO — the loser, not the winner.
  {
    key: 'dumpster_fire', name: 'The Dumpster Fire', section: 'DUDS', category: 'MANAGER',
    blurb: 'Had the lowest score in the entire league.',
    formula: 'Lowest single-team score of the week, win or lose.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points', evidence: 'MATCHUP',
  },
  {
    key: 'choke_artist', name: 'The Choke Artist', section: 'DUDS', category: 'MANAGER',
    blurb: 'Lost despite being projected a heavy favorite.',
    // The mirror image of The Giant Killer: same matchup, opposite manager.
    formula: 'Largest pregame projected advantage that still ended in a loss.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Projected advantage', evidence: 'MATCHUP',
  },
  {
    key: 'bad_beat', name: 'The Bad Beat', section: 'DUDS', category: 'MANAGER',
    blurb: 'Had a high score. Still lost their matchup.',
    formula: 'Highest team score among losing teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a loss', evidence: 'MATCHUP',
  },
  {
    key: 'public_execution', name: 'The Public Execution', section: 'DUDS', category: 'MANAGER',
    blurb: 'Lost their matchup by the largest margin.',
    formula: 'Largest losing margin, credited to the team that was beaten.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Losing margin', evidence: 'MATCHUP',
  },
  {
    key: 'bench_bum', name: 'The Bench Bum', section: 'DUDS', category: 'MANAGER',
    // Same correction as The Mastermind: this is the gap to the best legal
    // lineup, not the bench's raw total.
    blurb: 'Furthest from their optimal lineup this week.',
    formula: 'Largest gap between actual starter points and the highest-scoring legal lineup — the inverse of The Mastermind.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left behind',
  },
  {
    key: 'free_fall', name: 'The Free Fall', section: 'DUDS', category: 'MANAGER',
    blurb: 'Dropped further down the table than anyone.',
    // "Record and points" is not a second measurement bolted on — it is what
    // the standings rank already IS, in this league's own seeding order:
    // head-to-head record, then head-to-head, then points for. Falling in the
    // table therefore folds both in by construction.
    formula: 'Largest drop in standings position against last week, under the league\'s own seeding rules. Cannot exist in week 1, which has no table to fall from.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Places lost',
  },
  {
    key: 'understudy', name: 'The Understudy', section: 'DUDS', category: 'MANAGER',
    blurb: 'The best performance nobody started.',
    // Distinct from The Bench Bum, which measures the GAP to the best legal
    // lineup. This is one player, and the two regularly land on different
    // managers — a huge bench week only becomes a gap if the starter you left
    // in was worse.
    formula: 'Highest-scoring player left on a bench. Injured reserve is excluded — he could not have been started.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points benched', evidence: 'PLAYER',
  },
  {
    key: 'galaxy_brain', name: 'The Galaxy Brain', section: 'DUDS', category: 'MANAGER',
    blurb: 'Made the most roster moves and still lost.',
    formula: 'Most roster moves within ESPN\'s scoring period, among managers who lost — waiver claims, free agent adds, drops, trades, IR moves and start/sit swaps. A swap counts once, not once per player.',
    needs: ['TRANSACTIONS', 'FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Roster moves', evidence: 'MATCHUP',
  },
]

export const awardsBySection = (section: AwardSection) =>
  AWARDS
    .filter((a) => a.section === section)
    .sort((a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

export const CATEGORY_LABEL: Record<AwardCategory, string> = {
  MANAGER: 'Manager',
  MATCHUP: 'Team & Matchup',
  PLAYER: 'Player',
}

/** Awards grouped by how expensive their capture is. */
export const byCadence = (c: CaptureCadence) => AWARDS.filter((a) => a.capture === c)

/**
 * Data the ingest actually collects, as of 2026-09-11.
 *
 * All of it, now that `eligible_slots` is stored and the optimizer exists. The
 * remaining need, LIVE_EVENTS, belongs to awards nothing in the catalog claims
 * yet.
 */
const SATISFIED: ReadonlySet<DataNeed> = new Set<DataNeed>([
  'FINAL_SCORES', 'PLAYER_SCORES', 'PROJECTIONS', 'TRANSACTIONS', 'LINEUP_OPTIMIZER',
  // captureSnapshots has been recording every sync since 2026-09-11.
  'LIVE_EVENTS',
])

/** True when every dependency is satisfied by data we already have. */
export const isComputable = (def: AwardDef) =>
  def.needs.every((n) => SATISFIED.has(n))

export const NEED_LABEL: Record<DataNeed, string> = {
  FINAL_SCORES: 'Final scores',
  PLAYER_SCORES: 'Player scoring',
  PROJECTIONS: 'ESPN projections',
  LINEUP_OPTIMIZER: 'Lineup optimizer',
  TRANSACTIONS: 'Transaction history',
  LIVE_EVENTS: 'Live event tracking',
}

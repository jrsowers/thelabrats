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
  // Every Stud is won by a MANAGER. Where a player drives the result, the
  // player is shown as evidence beneath the manager, not as the recipient.
  {
    key: 'manager_of_the_week', name: 'The Mastermind', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who started the most optimal lineup.',
    formula: 'Smallest gap between actual starter points and the highest-scoring legal lineup. Requires a slot-aware optimizer — greedy bench substitution gives the wrong answer in a superflex league.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left on bench',
  },
  {
    key: 'waiver_wire_wizard', name: 'The Waiver Wire Wizard', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who grabbed the highest scoring free agent.',
    formula: 'Highest score by a player acquired from waivers or free agency this week, counted for the manager who claimed them.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points from the pickup', evidence: 'PLAYER',
  },
  {
    key: 'nostradamus', name: 'Fantasy Nostradamus', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who started the player with the highest score above projection.',
    formula: 'Largest actual-minus-projected among all started players, credited to the manager who started them.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Over projection', evidence: 'PLAYER',
  },
  {
    key: 'highway_robbery', name: 'The Cat Burglar', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager with the lowest score who still got a win.',
    formula: 'Lowest team score among winning teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a win', evidence: 'MATCHUP',
  },
  {
    key: 'bench_bum', name: 'The Bench Bum', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager with the highest scoring player on their bench.',
    formula: 'Highest-scoring player in a bench slot, credited to the manager who benched them.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points on the bench', evidence: 'PLAYER',
  },
  {
    key: 'prime_specimen', name: 'The Prime Specimen', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager that started the highest scoring player this week.',
    formula: 'Highest-scoring started player, credited to the manager who started them.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points', evidence: 'PLAYER',
  },

  // ---------------- DUDS ----------------
  // Not yet reworked — James is revising this list separately.
  {
    key: 'bench_boss', name: 'The Bench Boss', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who left the most points sitting on his bench.',
    formula: 'Largest gap between actual starter points and the highest-scoring legal lineup.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left behind',
  },
  {
    key: 'start_sit_crime', name: 'The Crime Scene', section: 'DUDS', category: 'MANAGER',
    blurb: 'The lineup decision that cost a manager the matchup.',
    formula: 'Largest benched-minus-started difference within a slot, where the gap exceeds the final margin.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Decision cost', evidence: 'PLAYER',
  },
  {
    key: 'too_cute', name: 'The Galaxy Brain', section: 'DUDS', category: 'MANAGER',
    blurb: 'The clever start that backfired completely.',
    formula: 'Started a player projected 6+ points below an available alternative, and lost the matchup.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Cost of cleverness', evidence: 'PLAYER',
  },
  {
    key: 'bad_beat', name: 'The Bad Beat', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The highest score that still lost its matchup.',
    formula: 'Highest team score among losing teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a loss', evidence: 'MATCHUP',
  },
  {
    key: 'choke_job', name: 'The Meltdown', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The largest collapse from a winning position.',
    formula: 'Largest drop from peak in-game win probability to a loss.',
    needs: ['LIVE_EVENTS'], capture: 'CONTINUOUS',
    metricLabel: 'Win probability lost',
  },
  {
    key: 'public_execution', name: 'The Public Execution', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The matchup with the largest margin of victory.',
    formula: 'Largest margin of victory.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Margin', evidence: 'MATCHUP',
  },
  {
    key: 'dumpster_fire', name: 'The Dumpster Fire', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The matchup with the lowest combined score.',
    formula: 'Lowest combined score across both teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Combined', evidence: 'MATCHUP',
  },
  {
    key: 'dud_of_the_week', name: 'The Lead Balloon', section: 'DUDS', category: 'PLAYER',
    blurb: 'The starter who fell furthest short of his projection.',
    formula: 'Largest projected-minus-actual among starters projected above 10 points.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Under projection', player: true, evidence: 'PLAYER',
  },
  {
    key: 'heartbreak_kid', name: 'The Heartbreak Kid', section: 'DUDS', category: 'PLAYER',
    blurb: 'The opposing player who single-handedly decided a matchup.',
    formula: 'Opposing player whose points exceeded the final margin by the most.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Margin swing', player: true, evidence: 'PLAYER',
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

/** True when every dependency is satisfied by data we already have. */
export const isComputable = (def: AwardDef) =>
  def.needs.every((n) => n === 'FINAL_SCORES')

export const NEED_LABEL: Record<DataNeed, string> = {
  FINAL_SCORES: 'Final scores',
  PLAYER_SCORES: 'Player scoring',
  PROJECTIONS: 'ESPN projections',
  LINEUP_OPTIMIZER: 'Lineup optimizer',
  TRANSACTIONS: 'Transaction history',
  LIVE_EVENTS: 'Live event tracking',
}

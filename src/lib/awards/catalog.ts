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
  // Every award is won by a MANAGER. Where a player or a matchup drives the
  // result, it is shown beneath as evidence rather than as the recipient.
  {
    key: 'mastermind', name: 'The Mastermind', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who started the most optimal lineup.',
    formula: 'Smallest gap between actual starter points and the highest-scoring legal lineup. Needs a slot-aware optimizer — greedy bench substitution is wrong in a superflex league, where the OP slot competes with QB for the same players.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left on bench',
  },
  {
    key: 'waiver_wire_wizard', name: 'The Waiver Wire Wizard', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who grabbed the highest scoring free agent.',
    formula: 'Highest score by a player acquired from waivers or free agency this week, credited to the manager who claimed them.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points from the pickup', evidence: 'PLAYER',
  },
  {
    key: 'nostradamus', name: 'Fantasy Nostradamus', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who started the player with the highest score above projection.',
    formula: 'Largest actual-minus-projected among started players, credited to the manager who started them.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Over projection', evidence: 'PLAYER',
  },
  {
    key: 'cat_burglar', name: 'The Cat Burglar', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager with the lowest score who still got a win.',
    formula: 'Lowest team score among winning teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a win', evidence: 'MATCHUP',
  },
  {
    key: 'giant_killer', name: 'The Giant Killer', section: 'STUDS', category: 'MANAGER',
    blurb: 'The biggest upset against the pregame projections.',
    // The mirror image of The Choke Artist: same matchup, opposite manager.
    formula: 'Largest pregame projected deficit that still ended in a win.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Projected deficit', evidence: 'MATCHUP',
  },
  {
    key: 'prime_specimen', name: 'The Prime Specimen', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager that started the highest scoring player this week.',
    formula: 'Highest-scoring started player, credited to the manager who started them.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points', evidence: 'PLAYER',
  },

  // ---------------- DUDS ----------------
  // Also all manager awards. Where a matchup outcome is the subject, the award
  // belongs to the manager it happened TO — the loser, not the winner.
  {
    key: 'dumpster_fire', name: 'The Dumpster Fire', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who had the lowest team score in the entire league.',
    formula: 'Lowest single-team score of the week, win or lose.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points', evidence: 'MATCHUP',
  },
  {
    key: 'choke_artist', name: 'The Choke Artist', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who was projected to win comfortably, but lost their matchup.',
    // The mirror image of The Giant Killer: same matchup, opposite manager.
    formula: 'Largest pregame projected advantage that still ended in a loss.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION',
    metricLabel: 'Projected advantage', evidence: 'MATCHUP',
  },
  {
    key: 'bad_beat', name: 'The Bad Beat', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager with the highest score that still lost their matchup.',
    formula: 'Highest team score among losing teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Points in a loss', evidence: 'MATCHUP',
  },
  {
    key: 'public_execution', name: 'The Public Execution', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who lost their matchup by the largest margin.',
    formula: 'Largest losing margin, credited to the team that was beaten.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY',
    metricLabel: 'Losing margin', evidence: 'MATCHUP',
  },
  {
    key: 'bench_bum', name: 'The Bench Bum', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who left the most points on their bench.',
    formula: 'Largest gap between actual starter points and the highest-scoring legal lineup — the inverse of The Mastermind.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE',
    metricLabel: 'Points left behind',
  },
  {
    key: 'galaxy_brain', name: 'The Galaxy Brain', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who made the most roster moves this week and lost their matchup.',
    formula: 'Most adds, drops and trades within the scoring period, among managers who lost.',
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

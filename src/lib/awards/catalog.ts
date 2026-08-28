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
  /** One line, shown on the card. */
  blurb: string
  /** The documented calculation (§22.8). */
  formula: string
  needs: DataNeed[]
  /** Label for the card's headline number. */
  metricLabel: string
  /** Heaviest capture cadence this award depends on. */
  capture: CaptureCadence
  /** Awards about a single player rather than a team. */
  player?: boolean
}

export const AWARDS: AwardDef[] = [
  // ---------------- STUDS ----------------
  {
    key: 'manager_of_the_week', name: 'Manager Of The Week', section: 'STUDS',
    blurb: 'The best all-round week in the league.',
    formula: 'Highest team score. Will become a composite of score, lineup efficiency and opponent strength once player data exists.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points',
  },
  {
    key: 'waiver_wire_wizard', name: 'The Waiver Wire Wizard', section: 'STUDS',
    blurb: 'Best return on a recent pickup.',
    formula: 'Highest points scored by a player acquired within the last 14 days, while started.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points since add', player: true,
  },
  {
    key: 'nostradamus', name: 'Fantasy Nostradamus', section: 'STUDS',
    blurb: 'Started someone nobody else believed in.',
    formula: 'Largest actual-minus-projected among starters projected below 8 points.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Over projection', player: true,
  },
  {
    key: 'highway_robbery', name: 'Highway Robbery', section: 'STUDS',
    blurb: 'Won without really earning it.',
    formula: 'Lowest score among winning teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points in a win',
  },
  {
    key: 'stud_of_the_week', name: 'Stud Of The Week', section: 'STUDS',
    blurb: 'The single best performance in the league.',
    formula: 'Highest-scoring started player, weighted against positional baseline.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points', player: true,
  },
  {
    key: 'benchwarmer_mvp', name: 'Benchwarmer MVP', section: 'STUDS',
    blurb: 'Scored a pile of points from the bench.',
    formula: 'Highest-scoring player in a bench slot.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Bench points', player: true,
  },
  {
    key: 'waiver_wire_hero', name: 'Waiver Wire Hero', section: 'STUDS',
    blurb: 'A pickup that paid off immediately.',
    formula: 'Highest single-week score by a player added this week.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points', player: true,
  },
  {
    key: 'one_man_army', name: 'One-Man Army', section: 'STUDS',
    blurb: 'Carried an entire roster single-handed.',
    formula: 'Largest share of a team’s weekly total contributed by one starter.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Share of team', player: true,
  },
  {
    key: 'photo_finish', name: 'The Photo Finish', section: 'STUDS',
    blurb: 'Decided by almost nothing.',
    formula: 'Smallest margin of victory.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Margin',
  },
  {
    key: 'shootout', name: 'Shootout Of The Week', section: 'STUDS',
    blurb: 'Neither defence showed up. Neither cared.',
    formula: 'Highest combined score across both teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Combined',
  },
  {
    key: 'david_slays_goliath', name: 'David Slays Goliath', section: 'STUDS',
    blurb: 'The upset nobody had.',
    formula: 'Largest win by the team with the lower pregame projection.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Projected deficit',
  },

  // ---------------- DUDS ----------------
  {
    key: 'bench_boss', name: 'The Bench Boss', section: 'DUDS',
    blurb: 'Left the win sitting on the bench.',
    formula: 'Largest gap between actual starter points and the highest-scoring legal lineup.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points left behind',
  },
  {
    key: 'start_sit_crime', name: 'The Start/Sit Crime Of The Week', section: 'DUDS',
    blurb: 'One decision. One loss.',
    formula: 'Largest benched-minus-started difference within a slot, where the gap exceeds the final margin.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Decision cost',
  },
  {
    key: 'too_cute', name: 'The Too Cute Award', section: 'DUDS',
    blurb: 'Outsmarted themselves.',
    formula: 'Started a player projected 6+ points below an available alternative, and lost the matchup.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Cost of cleverness',
  },
  {
    key: 'bad_beat', name: 'Bad Beat Of The Week', section: 'DUDS',
    blurb: 'Did everything right and lost anyway.',
    formula: 'Highest score among losing teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points in a loss',
  },
  {
    key: 'choke_job', name: 'Choke Job', section: 'DUDS',
    blurb: 'Had it won. Then didn’t.',
    formula: 'Largest drop from peak in-game win probability to a loss.',
    needs: ['LIVE_EVENTS'], capture: 'CONTINUOUS', metricLabel: 'Win probability lost',
  },
  {
    key: 'dud_of_the_week', name: 'Dud Of The Week', section: 'DUDS',
    blurb: 'The worst start anyone made.',
    formula: 'Largest projected-minus-actual among starters projected above 10 points.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Under projection', player: true,
  },
  {
    key: 'heartbreak_kid', name: 'Heartbreak Kid', section: 'DUDS',
    blurb: 'One player ruined someone else’s week.',
    formula: 'Opposing player whose points exceeded the final margin by the most.',
    // Corrected 2026-08-28: this reads only the final boxscore and the final
    // margin. It was mis-tagged as needing live events.
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Margin swing', player: true,
  },
  {
    key: 'public_execution', name: 'The Public Execution', section: 'DUDS',
    blurb: 'Not a game. A demonstration.',
    formula: 'Largest margin of victory.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Margin',
  },
  {
    key: 'dumpster_fire', name: 'The Dumpster Fire', section: 'DUDS',
    blurb: 'Two teams, barely one score between them.',
    formula: 'Lowest combined score across both teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Combined',
  },
]

export const awardsBySection = (section: AwardSection) =>
  AWARDS.filter((a) => a.section === section)

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

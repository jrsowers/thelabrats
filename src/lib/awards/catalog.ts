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
  /** Awards about a single player rather than a team. */
  player?: boolean
}

export const AWARDS: AwardDef[] = [
  // ---------------- STUDS ----------------
  {
    key: 'manager_of_the_week', name: 'The Mastermind', section: 'STUDS', category: 'MANAGER',
    blurb: 'The manager who posted the highest score in the league this week.',
    formula: 'Highest team score. Will become a composite of score, lineup efficiency and opponent strength once player data exists.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points',
  },
  {
    key: 'waiver_wire_wizard', name: 'The Waiver Wire Wizard', section: 'STUDS', category: 'MANAGER',
    blurb: 'The best return on a player picked up in the last two weeks.',
    formula: 'Highest points scored by a player acquired within the last 14 days, while started.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points since add', player: true,
  },
  {
    key: 'nostradamus', name: 'Fantasy Nostradamus', section: 'STUDS', category: 'MANAGER',
    blurb: 'The starter nobody else believed in, who delivered anyway.',
    formula: 'Largest actual-minus-projected among starters projected below 8 points.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Over projection', player: true,
  },
  {
    key: 'highway_robbery', name: 'The Cat Burglar', section: 'STUDS', category: 'MATCHUP',
    blurb: 'The lowest score that still walked away with a win.',
    formula: 'Lowest score among winning teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points in a win',
  },
  {
    key: 'stud_of_the_week', name: 'The Prime Specimen', section: 'STUDS', category: 'PLAYER',
    blurb: 'The highest-scoring starter in the entire league.',
    formula: 'Highest-scoring started player, weighted against positional baseline.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points', player: true,
  },
  {
    key: 'benchwarmer_mvp', name: 'The Understudy', section: 'STUDS', category: 'PLAYER',
    blurb: 'The highest-scoring player who never left the bench.',
    formula: 'Highest-scoring player in a bench slot.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Bench points', player: true,
  },
  {
    key: 'waiver_wire_hero', name: 'The Lottery Ticket', section: 'STUDS', category: 'PLAYER',
    blurb: 'The best single week from a player added this week.',
    formula: 'Highest single-week score by a player added this week.',
    needs: ['TRANSACTIONS', 'PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points', player: true,
  },
  {
    key: 'one_man_army', name: 'One-Man Army', section: 'STUDS', category: 'PLAYER',
    blurb: 'The player who carried the largest share of his team’s score.',
    formula: 'Largest share of a team’s weekly total contributed by one starter.',
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Share of team', player: true,
  },
  {
    key: 'photo_finish', name: 'The Photo Finish', section: 'STUDS', category: 'MATCHUP',
    blurb: 'The matchup decided by the smallest margin.',
    formula: 'Smallest margin of victory.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Margin',
  },
  {
    key: 'shootout', name: 'The Track Meet', section: 'STUDS', category: 'MATCHUP',
    blurb: 'The matchup with the highest combined score.',
    formula: 'Highest combined score across both teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Combined',
  },
  {
    key: 'david_slays_goliath', name: 'The Giant Killer', section: 'STUDS', category: 'MATCHUP',
    blurb: 'The biggest upset against the pregame projections.',
    formula: 'Largest win by the team with the lower pregame projection.',
    needs: ['PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Projected deficit',
  },

  // ---------------- DUDS ----------------
  {
    key: 'bench_boss', name: 'The Bench Boss', section: 'DUDS', category: 'MANAGER',
    blurb: 'The manager who left the most points sitting on his bench.',
    formula: 'Largest gap between actual starter points and the highest-scoring legal lineup.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Points left behind',
  },
  {
    key: 'start_sit_crime', name: 'The Crime Scene', section: 'DUDS', category: 'MANAGER',
    blurb: 'The lineup decision that cost a manager the matchup.',
    formula: 'Largest benched-minus-started difference within a slot, where the gap exceeds the final margin.',
    needs: ['PLAYER_SCORES', 'LINEUP_OPTIMIZER'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Decision cost',
  },
  {
    key: 'too_cute', name: 'The Galaxy Brain', section: 'DUDS', category: 'MANAGER',
    blurb: 'The clever start that backfired completely.',
    formula: 'Started a player projected 6+ points below an available alternative, and lost the matchup.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Cost of cleverness',
  },
  {
    key: 'bad_beat', name: 'The Bad Beat', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The highest score that still lost its matchup.',
    formula: 'Highest score among losing teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Points in a loss',
  },
  {
    key: 'choke_job', name: 'The Meltdown', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The largest collapse from a winning position.',
    formula: 'Largest drop from peak in-game win probability to a loss.',
    needs: ['LIVE_EVENTS'], capture: 'CONTINUOUS', metricLabel: 'Win probability lost',
  },
  {
    key: 'dud_of_the_week', name: 'The Lead Balloon', section: 'DUDS', category: 'PLAYER',
    blurb: 'The starter who fell furthest short of his projection.',
    formula: 'Largest projected-minus-actual among starters projected above 10 points.',
    needs: ['PLAYER_SCORES', 'PROJECTIONS'], capture: 'PREGAME_PROJECTION', metricLabel: 'Under projection', player: true,
  },
  {
    key: 'heartbreak_kid', name: 'The Heartbreak Kid', section: 'DUDS', category: 'PLAYER',
    blurb: 'The opposing player who single-handedly decided a matchup.',
    formula: 'Opposing player whose points exceeded the final margin by the most.',
    // Corrected 2026-08-28: this reads only the final boxscore and the final
    // margin. It was mis-tagged as needing live events.
    needs: ['PLAYER_SCORES'], capture: 'WEEKLY_BOXSCORE', metricLabel: 'Margin swing', player: true,
  },
  {
    key: 'public_execution', name: 'The Public Execution', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The matchup with the largest margin of victory.',
    formula: 'Largest margin of victory.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Margin',
  },
  {
    key: 'dumpster_fire', name: 'The Dumpster Fire', section: 'DUDS', category: 'MATCHUP',
    blurb: 'The matchup with the lowest combined score.',
    formula: 'Lowest combined score across both teams.',
    needs: ['FINAL_SCORES'], capture: 'FINAL_ONLY', metricLabel: 'Combined',
  },
]

/** Awards in display order: manager judgement, then matchups, then players. */
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

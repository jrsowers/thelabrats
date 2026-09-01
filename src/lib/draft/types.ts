/** A player as the draft engine needs them. Sourced from kona_player_info. */
export interface DraftablePlayer {
  id: number
  name: string
  pos: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'
  proTeam: string | null
  /**
   * Rank on THIS league's board — value over replacement, from ESPN projections
   * scored by this league's own rules.
   *
   * Not ESPN's generic SUPERFLEX rank, which assumes ESPN defaults and
   * disagrees with this league by a median of 12 slots: 6-point passing TDs and
   * half-PPR are not priced in it. Derrick Henry is ESPN #39 and #9 here.
   *
   * Not standard ADP either. Josh Allen's ADP is 19.4 because standard leagues
   * do not start a second QB; measuring against it flags every correct
   * superflex QB pick as a reach. ADP survives only as the punchline.
   */
  leagueRank: number
  /** Standard ADP. Not the yardstick — the punchline. */
  adp: number
  injuryStatus: string | null
}

export interface RawPick {
  overallPickNumber: number
  roundId: number
  roundPickNumber: number
  teamId: number
  playerId: number
  keeper: boolean
  autoDraftTypeId: number
}

export interface TeamMeta {
  teamId: number
  teamName: string
  manager: string
  managerFirst: string
}

/** Everything true about a pick, computed — never written by a model. */
export interface PickAnalysis {
  overallPickNumber: number
  round: number
  roundPick: number
  team: TeamMeta
  player: DraftablePlayer
  /** leagueRank − pick. Positive = reached for him, negative = value. */
  reachSlots: number
  /** adp − pick. The "rest of America" number. */
  adpSlots: number
  /** Was this pick made by the autodraft robot? */
  autodrafted: boolean
  /** How many better-ranked players were still available. THE reach metric. */
  betterAvailable: number
  /** Best player left on the board, or null when they took him. */
  bestAvailable: DraftablePlayer | null
  /** Players passed over who ranked meaningfully higher. */
  passedOver: DraftablePlayer[]
  /** Players this manager already has from the same NFL team. */
  sameProTeamAlreadyRostered: string[]
  /** Same NFL team AND same position as one he already owns. */
  isHandcuff: boolean
  /** This team's positional counts AFTER this pick. */
  rosterAfter: Record<string, number>
  /** Same position taken in the 5 picks before this one. */
  positionRun: number
  /** First of this position taken in the whole draft. */
  firstAtPosition: boolean
  /** Notability 0..100 — drives whether we bother roasting it. */
  notability: number
  /** Machine-readable reasons, for template fallback and for the writer. */
  flags: PickFlag[]
}

export type PickFlag =
  | 'MASSIVE_REACH'
  | 'REACH'
  | 'VALUE'
  | 'MASSIVE_VALUE'
  | 'PASSED_ON_STUD'
  | 'POSITION_RUN'
  | 'FIRST_KICKER'
  | 'FIRST_DST'
  | 'EARLY_KICKER'
  | 'EARLY_DST'
  | 'ROSTER_IMBALANCE'
  | 'NO_QB_LATE'
  | 'AUTODRAFTED'
  | 'INJURED'
  | 'ON_THE_CLOCK_STEAL'
  | 'BEST_AVAILABLE'

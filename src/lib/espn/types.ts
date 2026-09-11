/**
 * Normalized internal types. Application code consumes ONLY these — never raw
 * ESPN JSON (spec §7). If a field name here looks like ESPN's, that's
 * coincidence, not coupling.
 */

export interface LeagueSettings {
  espnLeagueId: number
  season: number
  name: string
  teamCount: number
  regularSeasonWeeks: number
  finalScoringPeriod: number
  playoffTeamCount: number
  /** e.g. 'H2H_RECORD' */
  seedingRule: string
  hasDivisions: boolean
  divisions: { id: number; name: string }[]
  usesFaab: boolean
  faabBudget: number | null
  acquisitionType: string
  /** lineupSlotId -> count. Drives the lineup optimizer. */
  lineupSlotCounts: Record<number, number>
  /** Round number -> weeks that round spans. `{}` means one week per round. */
  playoffRoundLengths: Record<number, number>
  /** ESPN's `playoffReseed`. False means a fixed bracket. */
  playoffReseed: boolean
  draft: {
    type: string
    scheduledAt: string | null
    completed: boolean
    inProgress: boolean
    keeperCount: number
  }
}

export interface Manager {
  /** ESPN member GUID — the stable cross-season franchise key (spec §25). */
  espnMemberId: string
  firstName: string
  lastName: string
  displayName: string
}

export interface FantasyTeam {
  espnTeamId: number
  name: string
  abbreviation: string | null
  logoUrl: string | null
  divisionId: number | null
  /** Member GUIDs. Usually one; co-managed teams have several. */
  ownerIds: string[]
}

/**
 * ESPN's own standings row and playoff forecast for one team.
 *
 * We still compute the record ourselves from `matchups` — this is what ESPN
 * says, kept so the site can mirror the official seed and surface a forecast
 * we have no honest way to reproduce.
 */
export interface EspnTeamStanding {
  espnTeamId: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  streakType: string | null
  streakLength: number
  gamesBack: number | null
  /** Official seed. Preseason ESPN fills this with reverse draft order. */
  playoffSeed: number | null
  /** 'UNKNOWN' until ESPN decides — never treat it as "not clinched". */
  playoffClinch: string | null
  eliminated: boolean
  eliminationWeek: number | null
  finalRank: number | null
  /** Monte Carlo playoff probability, 0-1. Null when ESPN has not run one. */
  playoffOdds: number | null
  projectedRank: number | null
  projectedWins: number | null
  projectedLosses: number | null
  waiverRank: number | null
}

export type MatchupStatus = 'SCHEDULED' | 'LIVE' | 'FINAL'

export interface Matchup {
  espnMatchupId: number
  /** Fantasy matchup period. NOT the NFL week — see `week`. */
  matchupPeriod: number
  /** NFL scoring period. Equals matchupPeriod in the regular season; may differ in playoffs. */
  week: number
  homeTeamId: number | null
  awayTeamId: number | null
  homeScore: number
  awayScore: number
  homeProjectedScore: number | null
  awayProjectedScore: number | null
  status: MatchupStatus
  winnerTeamId: number | null
  isPlayoff: boolean
}

export interface PlayerWeekScore {
  espnPlayerId: number
  fullName: string
  position: string
  proTeam: string
  espnTeamId: number
  lineupSlotId: number
  lineupSlot: string
  isStarter: boolean
  /**
   * Null means ESPN has published no actual line for this player yet — his
   * game has not started. Zero means he played and scored nothing. Collapsing
   * the two would turn every un-played starter into a goose egg.
   */
  actualPoints: number | null
  projectedPoints: number | null
  /** ESPN's slot eligibility. The lineup optimizer's constraint set. */
  eligibleSlots: number[]
  injuryStatus: string | null
}

export type TransactionType = 'WAIVER' | 'FREE_AGENT' | 'DROP' | 'TRADE' | 'DRAFT' | 'OTHER'
  | 'IR_PLACE'
  | 'IR_ACTIVATE'

export interface TransactionItem {
  espnPlayerId: number
  action: 'ADD' | 'DROP' | 'TRADE'
  fromTeamId: number | null
  toTeamId: number | null
}

export type TransactionFilter = 'ALL' | 'ADD' | 'DROP' | 'TRADE' | 'WAIVER'

export interface Transaction {
  espnTransactionId: string
  type: TransactionType
  status: string
  espnTeamId: number | null
  proposedAt: string | null
  processedAt: string | null
  scoringPeriod: number | null
  /** Null in this league — traditional waivers, not FAAB. Kept for portability. */
  faabAmount: number | null
  items: TransactionItem[]
}

export interface PoolPlayer {
  espnPlayerId: number
  fullName: string
  position: string
  nflTeam: string
  /** Lineup slot ids this player may fill. Superflex detection lives here. */
  eligibleSlots: number[]
  active: boolean
  injuryStatus: string | null
}

export interface LeagueStatus {
  currentMatchupPeriod: number
  latestScoringPeriod: number
  finalScoringPeriod: number
  isActive: boolean
  previousSeasons: number[]
}

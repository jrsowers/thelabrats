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
  actualPoints: number | null
  projectedPoints: number | null
}

export type TransactionType = 'WAIVER' | 'FREE_AGENT' | 'DROP' | 'TRADE' | 'DRAFT' | 'OTHER'

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

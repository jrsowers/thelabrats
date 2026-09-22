/**
 * Zod schemas for ESPN payloads (spec §43).
 *
 * Deliberately LENIENT: ESPN adds and reorders fields without notice, and an
 * over-strict schema turns a harmless upstream addition into an outage. We
 * validate the fields we actually consume and pass the rest through.
 */
import { z } from 'zod'

const num = z.number()
const maybeNum = z.number().nullish()

export const memberSchema = z.object({
  id: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  displayName: z.string().nullish(),
})

/** One side of ESPN's `record` object. Also the shape of `modeRecord`. */
const recordSplitSchema = z.object({
  wins: maybeNum,
  losses: maybeNum,
  ties: maybeNum,
  pointsFor: maybeNum,
  pointsAgainst: maybeNum,
  streakType: z.string().nullish(),
  streakLength: maybeNum,
  gamesBack: maybeNum,
  percentage: maybeNum,
})

export const teamSchema = z.object({
  id: num,
  name: z.string().nullish(),
  location: z.string().nullish(),
  nickname: z.string().nullish(),
  abbrev: z.string().nullish(),
  logo: z.string().nullish(),
  divisionId: maybeNum,
  owners: z.array(z.string()).nullish(),
  primaryOwner: z.string().nullish(),

  // ---- ESPN's own standings (view=mTeam) ----
  record: z.object({
    overall: recordSplitSchema.nullish(),
    home: recordSplitSchema.nullish(),
    away: recordSplitSchema.nullish(),
    division: recordSplitSchema.nullish(),
  }).nullish(),
  playoffSeed: maybeNum,
  eliminated: z.boolean().nullish(),
  eliminationMatchupPeriod: maybeNum,
  rankCalculatedFinal: maybeNum,
  rankFinal: maybeNum,
  currentProjectedRank: maybeNum,
  waiverRank: maybeNum,

  // ---- ESPN's forecast (view=mStandings) ----
  // These arrive on the same `teams` array but ONLY when mStandings is among
  // the requested views. mTeam alone returns neither.
  playoffClinchType: z.string().nullish(),
  currentSimulationResults: z.object({
    playoffPct: maybeNum,
    divisionWinPct: maybeNum,
    rank: maybeNum,
    playoffClinchType: z.string().nullish(),
    modeRecord: recordSplitSchema.nullish(),
  }).nullish(),

  /**
   * The team's roster (view=mRoster ONLY).
   *
   * ⚠️ THIS IS THE ONLY PLACE ESPN RETURNS `injuryStatus`. The player object
   * inside mBoxscore and mMatchupScore is minimal — id, fullName,
   * defaultPositionId, proTeamId, eligibleSlots, stats, and nothing else — so
   * `player_week_scores.game_status` sat null for every row ever written while
   * the transform dutifully read a field that was never present.
   *
   * Declared lazily because `rosterEntrySchema` is defined further down.
   */
  roster: z.object({
    entries: z.array(z.lazy(() => rosterEntrySchema)).nullish(),
  }).nullish(),
})

export const settingsSchema = z.object({
  name: z.string().nullish(),
  size: maybeNum,
  scheduleSettings: z.object({
    matchupPeriodCount: maybeNum,
    playoffTeamCount: maybeNum,
    playoffSeedingRule: z.string().nullish(),
    playoffReseed: z.boolean().nullish(),
    // Round number -> how many NFL weeks that round spans. This league's
    // championship is two weeks, so the final is NOT one week after the semi.
    playoffMatchupPeriodLengthByRound: z.record(z.string(), num).nullish(),
    divisions: z.array(z.object({ id: num, name: z.string().nullish() })).nullish(),
  }).nullish(),
  rosterSettings: z.object({
    lineupSlotCounts: z.record(z.string(), num).nullish(),
  }).nullish(),
  acquisitionSettings: z.object({
    acquisitionBudget: maybeNum,
    acquisitionType: z.string().nullish(),
    isUsingAcquisitionBudget: z.boolean().nullish(),
  }).nullish(),
  draftSettings: z.object({
    type: z.string().nullish(),
    date: maybeNum,
    keeperCount: maybeNum,
  }).nullish(),
})

export const statusSchema = z.object({
  currentMatchupPeriod: maybeNum,
  latestScoringPeriod: maybeNum,
  finalScoringPeriod: maybeNum,
  isActive: z.boolean().nullish(),
  previousSeasons: z.array(num).nullish(),
})

/** One player's scoring line for a single period. See STAT_SOURCE. */
const playerStatSchema = z.object({
  statSourceId: maybeNum,
  statSplitTypeId: maybeNum,
  scoringPeriodId: maybeNum,
  appliedTotal: maybeNum,
})

const rosterEntrySchema = z.object({
  playerId: maybeNum,
  lineupSlotId: maybeNum,
  playerPoolEntry: z.object({
    appliedStatTotal: maybeNum,
    player: z.object({
      id: maybeNum,
      fullName: z.string().nullish(),
      defaultPositionId: maybeNum,
      proTeamId: maybeNum,
      injuryStatus: z.string().nullish(),
      eligibleSlots: z.array(num).nullish(),
      stats: z.array(playerStatSchema).nullish(),
    }).nullish(),
  }).nullish(),
})

const matchupSideSchema = z.object({
  teamId: num,
  totalPoints: maybeNum,
  /**
   * ⚠️ The RUNNING total. `totalPoints` stays 0 until ESPN closes the scoring
   * period, so this is the only live number — see toMatchups.
   * Populated by mMatchupScore / mScoreboard, NOT by mBoxscore.
   */
  totalPointsLive: maybeNum,
  totalProjectedPoints: maybeNum,
  totalProjectedPointsLive: maybeNum,
  /** Commissioner stat correction, already folded into the live totals. */
  adjustment: maybeNum,
  /**
   * The lineup as it stands for the requested `scoringPeriodId`.
   * `appliedStatTotal` here equals the sum of the STARTERS' actual points —
   * verified across all 12 teams, in both mBoxscore and mMatchupScore.
   */
  rosterForCurrentScoringPeriod: z.object({
    appliedStatTotal: maybeNum,
    entries: z.array(rosterEntrySchema).nullish(),
  }).nullish(),
}).nullish()

export const matchupSchema = z.object({
  /** ⚠️ Absent on mLiveScoring and mStandings. */
  id: maybeNum,
  /**
   * ⚠️ Absent on `mScoreboard`, present on mMatchupScore/mLiveScoring/mBoxscore.
   * Lenient here so a scoreboard payload parses rather than failing the sync;
   * toMatchups() drops entries it cannot place in a week.
   */
  matchupPeriodId: maybeNum,
  playoffTierType: z.string().nullish(),
  winner: z.string().nullish(),
  home: matchupSideSchema,
  away: matchupSideSchema,
})

/**
 * Transactions (`mTransactions2`).
 *
 * ⚠️ SHAPE UNVERIFIED. This league had zero transactions at capture time, so
 * the fields below come from documented behaviour rather than an observed
 * payload (§60). Capture a real one after the Sept 3 draft and confirm before
 * trusting the Transaction Log.
 */
export const transactionItemSchema = z.object({
  playerId: maybeNum,
  type: z.string().nullish(),
  // Lineup slots. 21 is IR, which is how an IR move is told apart from an
  // ordinary start/sit inside a ROSTER transaction.
  fromLineupSlotId: maybeNum,
  toLineupSlotId: maybeNum,
  fromTeamId: maybeNum,
  toTeamId: maybeNum,
})

export const transactionSchema = z.object({
  id: z.union([z.string(), num]).nullish(),
  type: z.string().nullish(),
  status: z.string().nullish(),
  teamId: maybeNum,
  proposedDate: maybeNum,
  processDate: maybeNum,
  scoringPeriodId: maybeNum,
  bidAmount: maybeNum,
  items: z.array(transactionItemSchema).nullish(),
})

/**
 * Player pool (`kona_player_info`).
 *
 * ✅ VERIFIED 2026-08-28: returns 1,027 players pre-draft with names, positions,
 * pro teams and eligible slots. Requires an `x-fantasy-filter` header.
 */
export const poolPlayerSchema = z.object({
  player: z.object({
    id: num,
    fullName: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    defaultPositionId: maybeNum,
    proTeamId: maybeNum,
    eligibleSlots: z.array(num).nullish(),
    active: z.boolean().nullish(),
    injuryStatus: z.string().nullish(),
  }).nullish(),
})

export const playerPoolResponseSchema = z.object({
  players: z.array(poolPlayerSchema).nullish(),
})

/** Top-level league response. Views are additive, so nearly everything is optional. */
export const leagueResponseSchema = z.object({
  id: num,
  seasonId: maybeNum,
  scoringPeriodId: maybeNum,
  settings: settingsSchema.nullish(),
  status: statusSchema.nullish(),
  members: z.array(memberSchema).nullish(),
  teams: z.array(teamSchema).nullish(),
  schedule: z.array(matchupSchema).nullish(),
  transactions: z.array(transactionSchema).nullish(),
  draftDetail: z.object({
    drafted: z.boolean().nullish(),
    inProgress: z.boolean().nullish(),
    picks: z.array(z.unknown()).nullish(),
  }).nullish(),
})

export type LeagueResponse = z.infer<typeof leagueResponseSchema>
export type PlayerPoolResponse = z.infer<typeof playerPoolResponseSchema>

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
})

export const settingsSchema = z.object({
  name: z.string().nullish(),
  size: maybeNum,
  scheduleSettings: z.object({
    matchupPeriodCount: maybeNum,
    playoffTeamCount: maybeNum,
    playoffSeedingRule: z.string().nullish(),
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

const matchupSideSchema = z.object({
  teamId: num,
  totalPoints: maybeNum,
  totalProjectedPointsLive: maybeNum,
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

/**
 * ESPN JSON -> normalized internal objects.
 *
 * Pure functions, no I/O. Everything here is fixture-testable (spec §32), which
 * is what makes an ESPN payload change a contained, one-file fix.
 */
import {
  LINEUP_SLOT_LABEL, NON_STARTER_SLOTS, PRO_TEAM, POSITION_LABEL,
} from './constants'
import type { LeagueResponse } from './schemas'
import type {
  FantasyTeam, LeagueSettings, LeagueStatus, Manager, Matchup, MatchupStatus,
  Transaction, TransactionType,
} from './types'

export function toLeagueStatus(res: LeagueResponse): LeagueStatus {
  const s = res.status ?? {}
  return {
    currentMatchupPeriod: s.currentMatchupPeriod ?? 1,
    latestScoringPeriod: s.latestScoringPeriod ?? 0,
    finalScoringPeriod: s.finalScoringPeriod ?? 17,
    isActive: s.isActive ?? false,
    previousSeasons: s.previousSeasons ?? [],
  }
}

export function toLeagueSettings(res: LeagueResponse, season: number): LeagueSettings {
  const s = res.settings ?? {}
  const sched = s.scheduleSettings ?? {}
  const acq = s.acquisitionSettings ?? {}
  const draft = s.draftSettings ?? {}
  const status = res.status ?? {}

  const divisions = (sched.divisions ?? []).map((d) => ({ id: d.id, name: d.name ?? 'Division' }))

  // ESPN always returns at least one division. A single division is ESPN's way
  // of saying "no divisions" — treat it as such rather than rendering a
  // meaningless one-group standings table.
  const hasDivisions = divisions.length > 1

  const lineupSlotCounts: Record<number, number> = {}
  for (const [slot, count] of Object.entries(s.rosterSettings?.lineupSlotCounts ?? {})) {
    if (count > 0) lineupSlotCounts[Number(slot)] = count
  }

  // acquisitionBudget is populated even when FAAB is switched off, so the
  // boolean is what decides — not a non-zero budget.
  const usesFaab = acq.isUsingAcquisitionBudget === true

  return {
    espnLeagueId: res.id,
    season,
    name: s.name ?? 'Fantasy League',
    teamCount: s.size ?? (res.teams?.length ?? 0),
    regularSeasonWeeks: sched.matchupPeriodCount ?? 13,
    finalScoringPeriod: status.finalScoringPeriod ?? 17,
    playoffTeamCount: sched.playoffTeamCount ?? 6,
    seedingRule: sched.playoffSeedingRule ?? 'UNKNOWN',
    hasDivisions,
    divisions,
    usesFaab,
    faabBudget: usesFaab ? (acq.acquisitionBudget ?? null) : null,
    acquisitionType: acq.acquisitionType ?? 'UNKNOWN',
    lineupSlotCounts,
    draft: {
      type: draft.type ?? 'UNKNOWN',
      scheduledAt: draft.date ? new Date(draft.date).toISOString() : null,
      completed: res.draftDetail?.drafted ?? false,
      inProgress: res.draftDetail?.inProgress ?? false,
      keeperCount: draft.keeperCount ?? 0,
    },
  }
}

export function toManagers(res: LeagueResponse): Manager[] {
  return (res.members ?? []).map((m) => ({
    espnMemberId: m.id,
    firstName: m.firstName ?? '',
    lastName: m.lastName ?? '',
    displayName: m.displayName ?? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
  }))
}

export function toTeams(res: LeagueResponse): FantasyTeam[] {
  return (res.teams ?? []).map((t) => {
    // ESPN moved from location+nickname to a single `name`. Support both:
    // older seasons still return the split form.
    const composed = [t.location, t.nickname].filter(Boolean).join(' ').trim()
    const owners = t.owners ?? (t.primaryOwner ? [t.primaryOwner] : [])
    return {
      espnTeamId: t.id,
      name: t.name?.trim() || composed || `Team ${t.id}`,
      abbreviation: t.abbrev ?? null,
      logoUrl: t.logo ?? null,
      divisionId: t.divisionId ?? null,
      ownerIds: owners,
    }
  })
}

function matchupStatus(winner: string | null | undefined, homePts: number, awayPts: number): MatchupStatus {
  if (winner && winner !== 'UNDECIDED') return 'FINAL'
  if (homePts > 0 || awayPts > 0) return 'LIVE'
  return 'SCHEDULED'
}

/**
 * ⚠️ USE `mMatchupScore`. It is the ONLY view with a complete matchup shape.
 *
 * Every view returns a `schedule` array of 78 entries, but each is a different
 * partial projection (verified 2026-08-28, PRE-SEASON):
 *
 *   view            id  period  home/away  winner  playoffTier
 *   mMatchupScore   ✅    ✅        ✅        ✅        ✅
 *   mBoxscore       ✅    ✅        ✅        ✗         ✗
 *   mScoreboard     ✅    ✗         ✅        ✅        ✗
 *   mStandings      ✗     ✅        ✅        ✗         ✗
 *   mLiveScoring    ✗     ✅        ✗ (empty) ✗         ✗
 *   mSchedule       — returns an EMPTY schedule array
 *
 * Entries missing an id or a matchup period are DROPPED, not defaulted —
 * guessing a week would write silently wrong rows into `matchups`.
 *
 * ⚠️ Captured before any games were played. Re-verify once Week 1 is live;
 * these shapes may fill in, particularly mLiveScoring.
 */
export function toMatchups(res: LeagueResponse): Matchup[] {
  return (res.schedule ?? [])
    .filter((m): m is typeof m & { id: number; matchupPeriodId: number } =>
      typeof m.id === 'number' && typeof m.matchupPeriodId === 'number')
    .map((m) => {
    const homePts = m.home?.totalPoints ?? 0
    const awayPts = m.away?.totalPoints ?? 0
    const status = matchupStatus(m.winner, homePts, awayPts)

    let winnerTeamId: number | null = null
    if (status === 'FINAL') {
      if (m.winner === 'HOME') winnerTeamId = m.home?.teamId ?? null
      else if (m.winner === 'AWAY') winnerTeamId = m.away?.teamId ?? null
    }

    return {
      espnMatchupId: m.id,
      matchupPeriod: m.matchupPeriodId,
      // Regular season is 1:1. Playoff periods can span multiple NFL weeks —
      // resolve those from mStatus at ingest rather than assuming here.
      week: m.matchupPeriodId,
      homeTeamId: m.home?.teamId ?? null,
      awayTeamId: m.away?.teamId ?? null,
      homeScore: homePts,
      awayScore: awayPts,
      homeProjectedScore: m.home?.totalProjectedPointsLive ?? null,
      awayProjectedScore: m.away?.totalProjectedPointsLive ?? null,
      status,
      winnerTeamId,
      isPlayoff: (m.playoffTierType ?? 'NONE') !== 'NONE',
    }
  })
}

/**
 * ESPN transaction types -> ours.
 *
 * ⚠️ UNVERIFIED against a real payload — see schemas.ts. ROSTER entries are
 * lineup changes, not acquisitions, and are dropped rather than shown as moves.
 */
const TRANSACTION_TYPE: Record<string, TransactionType> = {
  WAIVER: 'WAIVER',
  FREEAGENT: 'FREE_AGENT',
  TRADE_ACCEPT: 'TRADE',
  TRADE_UPHOLD: 'TRADE',
  DRAFT: 'DRAFT',
}

export function toTransactions(res: LeagueResponse): Transaction[] {
  const raw = res.transactions ?? []
  return raw
    .filter((t) => (t.type ?? '') !== 'ROSTER')
    .map((t, i) => {
      const items = (t.items ?? [])
        .filter((it) => it.playerId != null && (it.type ?? '') !== 'LINEUP')
        .map((it) => ({
          espnPlayerId: it.playerId as number,
          action: (it.type === 'DROP' ? 'DROP' : it.type === 'ADD' ? 'ADD' : 'TRADE') as
            'ADD' | 'DROP' | 'TRADE',
          fromTeamId: it.fromTeamId ?? null,
          toTeamId: it.toTeamId ?? null,
        }))

      return {
        // ESPN ids are usually strings; fall back to a stable positional key so
        // a missing id cannot collapse several transactions onto one row.
        espnTransactionId: String(t.id ?? `unknown-${t.processDate ?? 0}-${i}`),
        type: TRANSACTION_TYPE[t.type ?? ''] ?? 'OTHER',
        status: t.status ?? 'UNKNOWN',
        espnTeamId: t.teamId ?? null,
        proposedAt: t.proposedDate ? new Date(t.proposedDate).toISOString() : null,
        processedAt: t.processDate ? new Date(t.processDate).toISOString() : null,
        scoringPeriod: t.scoringPeriodId ?? null,
        // Null unless the league actually uses FAAB; this one does not.
        faabAmount: t.bidAmount && t.bidAmount > 0 ? t.bidAmount : null,
        items,
      }
    })
}

export function lineupSlotLabel(slotId: number): string {
  return LINEUP_SLOT_LABEL[slotId] ?? `SLOT_${slotId}`
}
export function isStarterSlot(slotId: number): boolean {
  return !NON_STARTER_SLOTS.has(slotId)
}
export function proTeamAbbrev(id: number): string {
  return PRO_TEAM[id] ?? 'UNK'
}
export function positionLabel(id: number): string {
  return POSITION_LABEL[id] ?? 'UNK'
}

/**
 * ESPN JSON -> normalized internal objects.
 *
 * Pure functions, no I/O. Everything here is fixture-testable (spec §32), which
 * is what makes an ESPN payload change a contained, one-file fix.
 */
import {
  LINEUP_SLOT_LABEL, NON_STARTER_SLOTS, PRO_TEAM, POSITION_LABEL, STAT_SOURCE,
} from './constants'
import type { LeagueResponse, PlayerPoolResponse } from './schemas'
import type {
  FantasyTeam, LeagueSettings, LeagueStatus, Manager, Matchup, MatchupStatus,
  Transaction, TransactionType, PoolPlayer, EspnTeamStanding, PlayerWeekScore,
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

  const playoffRoundLengths: Record<number, number> = {}
  for (const [round, weeks] of Object.entries(sched.playoffMatchupPeriodLengthByRound ?? {})) {
    if (weeks > 0) playoffRoundLengths[Number(round)] = weeks
  }

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
    playoffRoundLengths,
    playoffReseed: sched.playoffReseed === true,
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

/**
 * ESPN's own standings row per team.
 *
 * Requires BOTH `mTeam` (record, seed, elimination) and `mStandings` (the
 * simulation and clinch type) — verified 2026-09-06. Requesting only one
 * silently yields half the fields, so the caller must pass both views.
 *
 * `playoffSeed` is filled preseason with reverse draft order, which is
 * meaningless at 0-0. It is stored as ESPN reports it; deciding when to trust
 * it belongs to the reader, not the parser.
 */
export function toEspnStandings(res: LeagueResponse): EspnTeamStanding[] {
  return (res.teams ?? []).map((t) => {
    const o = t.record?.overall ?? {}
    const sim = t.currentSimulationResults ?? {}
    const mode = sim.modeRecord ?? {}
    return {
      espnTeamId: t.id,
      wins: o.wins ?? 0,
      losses: o.losses ?? 0,
      ties: o.ties ?? 0,
      pointsFor: o.pointsFor ?? 0,
      pointsAgainst: o.pointsAgainst ?? 0,
      // ESPN uses the string 'NONE' for no streak. Null is the honest form.
      streakType: o.streakType && o.streakType !== 'NONE' ? o.streakType : null,
      streakLength: o.streakLength ?? 0,
      gamesBack: o.gamesBack ?? null,
      playoffSeed: t.playoffSeed ?? null,
      playoffClinch: t.playoffClinchType ?? sim.playoffClinchType ?? null,
      eliminated: t.eliminated === true,
      // 0 means "not eliminated", not "eliminated in week zero".
      eliminationWeek: t.eliminationMatchupPeriod ? t.eliminationMatchupPeriod : null,
      finalRank: t.rankCalculatedFinal ? t.rankCalculatedFinal : null,
      playoffOdds: sim.playoffPct ?? null,
      projectedRank: t.currentProjectedRank ?? sim.rank ?? null,
      projectedWins: mode.wins ?? null,
      projectedLosses: mode.losses ?? null,
      waiverRank: t.waiverRank ?? null,
    }
  })
}

function matchupStatus(winner: string | null | undefined, homePts: number, awayPts: number): MatchupStatus {
  if (winner && winner !== 'UNDECIDED') return 'FINAL'
  if (homePts > 0 || awayPts > 0) return 'LIVE'
  return 'SCHEDULED'
}

type MatchupSide = NonNullable<LeagueResponse['schedule']>[number]['home']

/**
 * ⚠️ `totalPoints` IS ZERO UNTIL ESPN CLOSES THE SCORING PERIOD.
 *
 * Verified 2026-09-11, mid-week-1 with two NFL games already final: every one
 * of the twelve teams read `totalPoints: 0.0` while `totalPointsLive` carried
 * the real score. Reading `totalPoints` is why the scoreboard sat at 0-0 for
 * two days, and — because a matchup only reaches LIVE when points exist — why
 * the adaptive cadence never escalated off its 15-minute routine.
 *
 * Three fields hold the same number and ESPN populates a different subset per
 * view, so take whichever is actually filled in:
 *
 *   totalPointsLive   the running total; spans a multi-week playoff matchup.
 *                     Present on mMatchupScore / mScoreboard, NOT on mBoxscore.
 *   appliedStatTotal  the same figure, and the only one mBoxscore fills.
 *                     Verified equal to the sum of that team's starters.
 *   totalPoints       the finalized figure, once ESPN writes it.
 *
 * A team that genuinely scores zero reads zero from all three — which is
 * correct, and harmless, because `winner` decides FINAL, never the points.
 */
function sideScore(side: MatchupSide): number {
  const candidates = [
    side?.totalPointsLive,
    side?.rosterForCurrentScoringPeriod?.appliedStatTotal,
    side?.totalPoints,
  ]
  for (const c of candidates) if (typeof c === 'number' && c !== 0) return c
  return 0
}

/** Projections follow the same live-vs-final split as the scores. */
function sideProjected(side: MatchupSide): number | null {
  const candidates = [side?.totalProjectedPointsLive, side?.totalProjectedPoints]
  for (const c of candidates) if (typeof c === 'number' && c !== 0) return c
  return null
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
    const homePts = sideScore(m.home)
    const awayPts = sideScore(m.away)
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
      homeProjectedScore: sideProjected(m.home),
      awayProjectedScore: sideProjected(m.away),
      status,
      winnerTeamId,
      isPlayoff: (m.playoffTierType ?? 'NONE') !== 'NONE',
    }
  })
}

/**
 * Per-player scoring for one NFL week — the data every player-level award,
 * the lineup optimizer and the boxscore depend on.
 *
 * ⚠️ REQUIRES BOTH `mMatchupScore` AND `mBoxscore` on the same request, plus
 * `scoringPeriodId`. Verified 2026-09-11: mMatchupScore carries the rosters and
 * the live team totals but omits `eligibleSlots`; mBoxscore carries the rosters
 * and `eligibleSlots` but zeroes the team totals. Neither alone is enough.
 *
 * ⚠️ THE STAT-SOURCE TRAP (CLAUDE.md). Actual and projected points sit in the
 * SAME `stats` array on the same player, told apart only by `statSourceId`, and
 * entries for OTHER weeks sit there too. Both filters are mandatory: source and
 * scoring period. Getting either wrong silently swaps projections for results.
 *
 * A missing ACTUAL row means the player's game has not kicked off, which is not
 * the same as scoring zero — see PlayerWeekScore.actualPoints.
 */
export function toPlayerWeekScores(
  res: LeagueResponse,
  scoringPeriodId: number,
): PlayerWeekScore[] {
  const out: PlayerWeekScore[] = []

  for (const m of res.schedule ?? []) {
    for (const side of [m.home, m.away]) {
      if (!side) continue
      const entries = side.rosterForCurrentScoringPeriod?.entries ?? []

      for (const e of entries) {
        const player = e.playerPoolEntry?.player
        const espnPlayerId = player?.id ?? e.playerId
        // A roster entry with no player id cannot be written against
        // `players`. Dropped rather than defaulted — see toMatchups.
        if (typeof espnPlayerId !== 'number') continue

        const slotId = e.lineupSlotId ?? -1
        const stats = player?.stats ?? []
        const pick = (source: number) =>
          stats.find(
            (st) => st.statSourceId === source && st.scoringPeriodId === scoringPeriodId,
          )?.appliedTotal

        const actual = pick(STAT_SOURCE.ACTUAL)
        const projected = pick(STAT_SOURCE.PROJECTED)

        out.push({
          espnPlayerId,
          fullName: player?.fullName?.trim() || `Player ${espnPlayerId}`,
          position: positionLabel(player?.defaultPositionId ?? -1),
          proTeam: proTeamAbbrev(player?.proTeamId ?? -1),
          espnTeamId: side.teamId,
          lineupSlotId: slotId,
          lineupSlot: lineupSlotLabel(slotId),
          isStarter: isStarterSlot(slotId),
          actualPoints: typeof actual === 'number' ? actual : null,
          projectedPoints: typeof projected === 'number' ? projected : null,
          eligibleSlots: player?.eligibleSlots ?? [],
          injuryStatus: player?.injuryStatus ?? null,
        })
      }
    }
  }

  return out
}

/**
 * ESPN transaction types -> ours.
 *
 * ✅ Verified against a live payload on 2026-09-03, right after the draft:
 * 185 transactions, 180 DRAFT and 5 ROSTER, all status EXECUTED. ROSTER
 * entries are lineup changes rather than acquisitions and are dropped.
 *
 * Two things the real payload corrected. Items carry `type: "DRAFT"`, which the
 * old mapping fell through to 'TRADE'; a draft pick is an acquisition, so it is
 * an ADD. And there is no `processDate` field at all — only `proposedDate` —
 * so processedAt was always null.
 */
const TRANSACTION_TYPE: Record<string, TransactionType> = {
  WAIVER: 'WAIVER',
  FREEAGENT: 'FREE_AGENT',
  TRADE_ACCEPT: 'TRADE',
  TRADE_UPHOLD: 'TRADE',
  DRAFT: 'DRAFT',
}

/** ESPN lineup slot for injured reserve. */
const IR_SLOT = 21

/**
 * ROSTER transactions are lineup changes, and almost all of them are start/sit
 * decisions that would flood a transaction log every week. The exception is IR:
 * moving a player onto or off injured reserve is a real roster event.
 *
 * Returns null for an ordinary shuffle, so the caller can drop it.
 */
function irKind(t: { items?: { fromLineupSlotId?: number | null; toLineupSlotId?: number | null }[] | null }):
  'IR_PLACE' | 'IR_ACTIVATE' | null {
  for (const it of t.items ?? []) {
    if (it.toLineupSlotId === IR_SLOT) return 'IR_PLACE'
    if (it.fromLineupSlotId === IR_SLOT) return 'IR_ACTIVATE'
  }
  return null
}

export function toTransactions(res: LeagueResponse): Transaction[] {
  const raw = res.transactions ?? []
  return raw
    // Keep ROSTER rows only when they touch injured reserve.
    .filter((t) => (t.type ?? '') !== 'ROSTER' || irKind(t) !== null)
    .map((t, i) => {
      const ir = (t.type ?? '') === 'ROSTER' ? irKind(t) : null

      const items = (t.items ?? [])
        // LINEUP items are normally noise, but on an IR move they are the whole
        // event — the player being placed or activated.
        .filter((it) => it.playerId != null && ((it.type ?? '') !== 'LINEUP' || ir !== null))
        .map((it) => ({
          espnPlayerId: it.playerId as number,
          action: (ir === 'IR_PLACE' ? 'DROP'
            : ir === 'IR_ACTIVATE' ? 'ADD'
            : it.type === 'DROP' ? 'DROP'
            : it.type === 'ADD' || it.type === 'DRAFT' ? 'ADD'
            : 'TRADE') as 'ADD' | 'DROP' | 'TRADE',
          fromTeamId: it.fromTeamId ?? null,
          toTeamId: it.toTeamId ?? null,
        }))

      return {
        // ESPN ids are usually strings; fall back to a stable positional key so
        // a missing id cannot collapse several transactions onto one row.
        espnTransactionId: String(t.id ?? `unknown-${t.processDate ?? 0}-${i}`),
        type: ir ?? TRANSACTION_TYPE[t.type ?? ''] ?? 'OTHER',
        status: t.status ?? 'UNKNOWN',
        espnTeamId: t.teamId ?? null,
        proposedAt: t.proposedDate ? new Date(t.proposedDate).toISOString() : null,
        // ESPN sends proposedDate and no processDate; everything here is
        // EXECUTED, so the proposal time is the moment it happened.
        processedAt: t.processDate
          ? new Date(t.processDate).toISOString()
          : t.proposedDate ? new Date(t.proposedDate).toISOString() : null,
        scoringPeriod: t.scoringPeriodId ?? null,
        // Null unless the league actually uses FAAB; this one does not.
        faabAmount: t.bidAmount && t.bidAmount > 0 ? t.bidAmount : null,
        items,
      }
    })
}

/**
 * Player pool -> normalized players.
 *
 * ✅ Verified against a live pre-draft pull: 1,027 players, zero missing names.
 */
export function toPoolPlayers(res: PlayerPoolResponse): PoolPlayer[] {
  return (res.players ?? [])
    .map((p) => p.player)
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.id))
    .map((p) => ({
      espnPlayerId: p.id,
      fullName: p.fullName ?? [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
      position: positionLabel(p.defaultPositionId ?? -1),
      nflTeam: proTeamAbbrev(p.proTeamId ?? 0),
      eligibleSlots: p.eligibleSlots ?? [],
      active: p.active ?? true,
      injuryStatus: p.injuryStatus ?? null,
    }))
    .filter((p) => p.fullName.length > 0)
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

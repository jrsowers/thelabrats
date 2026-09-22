/**
 * Per-player weekly scoring ingestion.
 *
 * This is the table every player-level award, the lineup optimizer and the
 * expanded boxscore read from. It was never being written: `syncLeague` covered
 * settings, teams, matchups and transactions, so `player_week_scores` sat at
 * zero rows all season and Studs & Duds had nothing to compute from.
 *
 * ESPN scopes rosters to a single `scoringPeriodId`, so this syncs ONE week per
 * call. The caller decides which — normally the current week, and every week
 * from 1 up on a backfill.
 *
 * ⚠️ HISTORY IS NOT FREE, BUT IT IS RECOVERABLE. Unlike a live score, a past
 * week's player line can be re-fetched by asking for its scoringPeriodId. A
 * missed week is a gap to backfill, not a permanent hole.
 *
 * Idempotent: upserts on (season, week, player, team), so re-running a week
 * corrects it rather than duplicating it.
 */
import { EspnClient } from '@/lib/espn/client'
import { VIEWS } from '@/lib/espn/constants'
import { toPlayerWeekScores, toInjuryStatuses } from '@/lib/espn/transforms'
import { createServiceClient } from '@/lib/supabase/server'

export interface RosterSyncResult {
  ok: boolean
  week: number
  /** Rows written to player_week_scores. */
  scores: number
  /** Distinct rostered players upserted, whether newly created or refreshed. */
  players: number
  error?: string
}

export async function syncRosters(
  espn: EspnClient,
  seasonId: number,
  week: number,
): Promise<RosterSyncResult> {
  const db = createServiceClient()

  try {
    // THREE views, one request. mMatchupScore has the rosters and live totals;
    // mBoxscore has the rosters and eligibleSlots; mRoster is the only one that
    // carries injuryStatus — the boxscore player object simply does not have
    // the field, which is why game_status was null on every row ever written.
    const res = await espn.getViews(
      [VIEWS.MATCHUP_SCORE, VIEWS.BOXSCORE, VIEWS.ROSTER],
      { scoringPeriodId: week },
    )

    const scores = toPlayerWeekScores(res, week)
    const injuries = toInjuryStatuses(res)
    if (scores.length === 0) {
      // Before week 1 ESPN returns rosters with no entries. Not an error —
      // there is simply nothing to record yet.
      return { ok: true, week, scores: 0, players: 0 }
    }

    // ---- season team ids ----
    const { data: teams, error: teamError } = await db
      .from('season_teams')
      .select('id, espn_team_id')
      .eq('season_id', seasonId)
    if (teamError) throw new Error(`season_teams read failed: ${teamError.message}`)
    const teamIdByEspnId = new Map((teams ?? []).map((t) => [t.espn_team_id, t.id]))

    // ---- players ----
    // A rostered player may be missing from `players`: the pool sync caps at
    // ~1,200 by ownership, and a deep-bench handcuff can fall outside it. The
    // foreign key would reject the score row, so create the player first.
    const unique = new Map(scores.map((s) => [s.espnPlayerId, s]))
    const { data: written, error: playerError } = await db
      .from('players')
      .upsert(
        [...unique.values()].map((s) => ({
          espn_player_id: s.espnPlayerId,
          full_name: s.fullName,
          position: s.position,
          nfl_team: s.proTeam,
          active: true,
          last_synced_at: new Date().toISOString(),
        })),
        { onConflict: 'espn_player_id' },
      )
      .select('id, espn_player_id')
    if (playerError) throw new Error(`players upsert failed: ${playerError.message}`)

    const playerIdByEspnId = new Map((written ?? []).map((p) => [p.espn_player_id, p.id]))

    const rows = scores
      .filter((s) => teamIdByEspnId.has(s.espnTeamId) && playerIdByEspnId.has(s.espnPlayerId))
      .map((s) => ({
        season_id: seasonId,
        week,
        player_id: playerIdByEspnId.get(s.espnPlayerId)!,
        season_team_id: teamIdByEspnId.get(s.espnTeamId)!,
        lineup_slot_id: s.lineupSlotId,
        lineup_slot: s.lineupSlot,
        is_starter: s.isStarter,
        projected_points: s.projectedPoints,
        actual_points: s.actualPoints,
        // The lineup optimizer's constraint set. NOT derivable from position —
        // a QB lists the superflex OP slot too.
        eligible_slots: s.eligibleSlots,
        // ⚠️ STATUS AT SYNC TIME, not status during the game — see
        // toInjuryStatuses. Records treat anything other than ACTIVE as
        // "was carrying something", which is why this must only ever be
        // written for a week while that week is current.
        game_status: injuries.get(s.espnPlayerId) ?? s.injuryStatus,
        last_synced_at: new Date().toISOString(),
      }))

    if (rows.length !== scores.length) {
      // Silently dropping roster rows is how a boxscore ends up short a player
      // with nothing in the logs to say why.
      throw new Error(
        `roster sync week ${week}: ${scores.length - rows.length} of ${scores.length} rows ` +
          'could not be mapped to a team or player',
      )
    }

    const { data: writtenScores, error: scoreError } = await db
      .from('player_week_scores')
      .upsert(rows, { onConflict: 'season_id,week,player_id,season_team_id' })
      .select('id')
    if (scoreError) throw new Error(`player_week_scores upsert failed: ${scoreError.message}`)

    return {
      ok: true,
      week,
      scores: writtenScores?.length ?? 0,
      players: written?.length ?? 0,
    }
  } catch (err) {
    return {
      ok: false,
      week,
      scores: 0,
      players: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

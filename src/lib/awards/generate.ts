/**
 * Writes a week's awards to the `awards` table, once.
 *
 * Until now the award engine computed on every request and stored nothing. That
 * was right while the page was mostly placeholders; it is wrong now that the
 * numbers are real, because a recomputed award can CHANGE — a Prime Specimen
 * named after the early games loses the title to the 4pm slate, and whoever
 * screenshotted it at 2pm is holding something the site no longer agrees with.
 *
 * So a week is generated once, after Monday Night Football, and then it is
 * settled. See release.ts for the timing and why it is a condition rather than
 * a cron expression.
 *
 * ⚠️ ONLY REAL AWARDS ARE WRITTEN. Placeholder cards stay a render-time
 * decoration — persisting invented values is how sample data stops being
 * distinguishable from the real thing (§22.8), and the whole placeholder design
 * rests on it never being written.
 *
 * Idempotent: upserts on (season_id, week, award_type). The table's own comment
 * says it — regenerable, deterministic from stored data, delete and recalculate
 * freely. That stays true; `regenerate` exists for when a formula changes.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { AWARDS } from './catalog'
import {
  computeWeeklyAwards, computePositionKings,
  type AwardMatchup, type AwardPlayer, type AwardTransaction, type AwardSnapshot,
} from './compute'

export interface GenerateResult {
  ok: boolean
  week: number
  awards: number
  error?: string
}

const NAME_BY_KEY = new Map(AWARDS.map((a) => [a.key, a.name]))

export async function generateWeeklyAwards(
  seasonId: number,
  week: number,
  matchups: AwardMatchup[],
  players: AwardPlayer[],
  transactions: AwardTransaction[] = [],
  slotCounts: Record<string | number, number> = {},
  snapshots: AwardSnapshot[] = [],
  movement: Map<number, number> = new Map(),
  { regenerate = false }: { regenerate?: boolean } = {},
): Promise<GenerateResult> {
  const db = createServiceClient()

  try {
    if (!regenerate) {
      const { count, error } = await db
        .from('awards')
        .select('id', { count: 'exact', head: true })
        .eq('season_id', seasonId)
        .eq('week', week)
      if (error) throw new Error(`awards read failed: ${error.message}`)
      // Already settled. Recomputing would be harmless today and wrong the
      // first time a formula is tuned mid-season.
      if ((count ?? 0) > 0) return { ok: true, week, awards: 0 }
    }

    const computed = computeWeeklyAwards(
      matchups, week, players, transactions, slotCounts, snapshots, movement,
    )
    const kings = computePositionKings(players)
    if (computed.length === 0 && kings.length === 0) return { ok: true, week, awards: 0 }

    // Player evidence points at `players.id`, not ESPN's id.
    const espnIds = [
      ...computed.map((a) => a.player?.espnPlayerId),
      ...kings.map((k) => k.espnPlayerId),
    ].filter((id): id is number => id != null)
    const playerIdByEspnId = new Map<number, number>()
    if (espnIds.length > 0) {
      const { data, error } = await db
        .from('players').select('id, espn_player_id').in('espn_player_id', espnIds)
      if (error) throw new Error(`players read failed: ${error.message}`)
      for (const p of data ?? []) playerIdByEspnId.set(p.espn_player_id as number, p.id as number)
    }

    const rows = computed.map((a) => ({
      season_id: seasonId,
      week,
      award_type: a.key,
      award_name: NAME_BY_KEY.get(a.key) ?? a.key,
      // Every award in this league is won by a MANAGER, even the ones whose
      // subject is a matchup or a player — see catalog.ts.
      recipient_type: 'TEAM' as const,
      recipient_team_id: a.teamId,
      recipient_player_id: a.player ? playerIdByEspnId.get(a.player.espnPlayerId) ?? null : null,
      // `metricValue` is a DISPLAY string and may carry a unit: Number("35%")
      // is NaN, which Postgres stored as null and left the season leaderboard
      // unable to sort two of the awards.
      score: a.scoreValue ?? Number(a.metricValue),
      headline: a.headline,
      // The card needs the opponent and the formatted metric back, and neither
      // has a column. Kept whole so the round-trip is lossless.
      supporting_stats: {
        opponentId: a.opponentId,
        metricValue: a.metricValue,
        supporting: a.supporting,
        player: a.player ?? null,
      },
      // Generated after the week is final, never mid-slate (§22.8).
      is_provisional: false,
    }))

    // The strip rides in the same table under its own keys, so it is published
    // and settled by exactly the same rules as everything else.
    const kingRows = kings.map((k) => ({
      season_id: seasonId,
      week,
      award_type: `position_king_${k.position}`,
      award_name: `Best ${k.position}`,
      recipient_type: 'PLAYER' as const,
      recipient_team_id: k.seasonTeamId,
      recipient_player_id: playerIdByEspnId.get(k.espnPlayerId) ?? null,
      score: k.points,
      headline: `${k.name} — ${k.points.toFixed(1)}`,
      supporting_stats: {
        position: k.position,
        player: {
          espnPlayerId: k.espnPlayerId, name: k.name,
          position: k.position, nflTeam: k.nflTeam,
        },
        projectedPoints: k.projectedPoints,
      },
      is_provisional: false,
    }))

    const all = [...rows, ...kingRows]
    const { data: written, error } = await db
      .from('awards')
      .upsert(all, { onConflict: 'season_id,week,award_type' })
      .select('id')
    if (error) throw new Error(`awards upsert failed: ${error.message}`)
    if ((written?.length ?? 0) !== all.length) {
      throw new Error(`awards upsert wrote ${written?.length ?? 0} of ${all.length}`)
    }

    return { ok: true, week, awards: written?.length ?? 0 }
  } catch (err) {
    return {
      ok: false, week, awards: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

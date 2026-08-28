/**
 * Player pool ingestion.
 *
 * ESPN's `kona_player_info` returns the full relevant player pool — ~1,000
 * players with names, positions, pro teams and eligible slots — and it works
 * BEFORE the draft. That was not obvious; it means transaction names and
 * lineup detail are not blocked on the season starting.
 *
 * Idempotent: upserts on espn_player_id, so running twice changes nothing.
 */
import { EspnClient } from '@/lib/espn/client'
import { toPoolPlayers } from '@/lib/espn/transforms'
import { createServiceClient } from '@/lib/supabase/server'

export interface PlayerSyncResult {
  ok: boolean
  players: number
  error?: string
}

export async function syncPlayers(espn: EspnClient): Promise<PlayerSyncResult> {
  const db = createServiceClient()
  try {
    const pool = await espn.getPlayerPool(1200)
    const players = toPoolPlayers(pool)
    if (players.length === 0) {
      return { ok: false, players: 0, error: 'player pool returned no usable players' }
    }

    // Chunked: a 1,000-row upsert in one request is large enough to be flaky.
    const CHUNK = 250
    let written = 0
    for (let i = 0; i < players.length; i += CHUNK) {
      const slice = players.slice(i, i + CHUNK)
      const { data, error } = await db
        .from('players')
        .upsert(
          slice.map((p) => ({
            espn_player_id: p.espnPlayerId,
            full_name: p.fullName,
            position: p.position,
            nfl_team: p.nflTeam,
            active: p.active,
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'espn_player_id' },
        )
        .select('id')
      if (error) throw error
      written += data?.length ?? 0
    }

    return { ok: true, players: written }
  } catch (err) {
    return { ok: false, players: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

import { createServiceClient } from '@/lib/supabase/server'
import { memberPhotoFor } from './feed-data'
import type { PickAnalysis } from './types'
import type { TeamMeta } from './types'

/**
 * Writes the draft feed to Postgres, where the deployed app can actually see
 * it. Upserts on (season, overall_pick), so re-running changes nothing that has
 * not moved — the same idempotency rule the ESPN ingest follows.
 *
 * EVERY slot is written, including ones nobody has used yet. An unmade pick is
 * a row with a null player, not a missing row, which is what lets the page name
 * who is on the clock.
 */
export interface PublishRow {
  overallPickNumber: number
  round: number
  roundPick: number
  team: TeamMeta
  /** Null for a slot that has not been used. */
  analysis: PickAnalysis | null
  roast: { text: string; theme: string; fallback: boolean } | null
}

export async function publishDraft(
  rows: PublishRow[], { season, sample }: { season: number; sample: boolean },
): Promise<number> {
  if (rows.length === 0) return 0
  const supabase = createServiceClient()

  const payload = rows.map((r) => ({
    season,
    overall_pick: r.overallPickNumber,
    round: r.round,
    round_pick: r.roundPick,
    espn_team_id: r.team.teamId,
    team_name: r.team.teamName,
    manager: r.team.managerFirst,
    manager_full: r.team.manager,
    manager_photo: memberPhotoFor(r.team.manager),
    espn_player_id: r.analysis?.player.id ?? null,
    player_name: r.analysis?.player.name ?? null,
    position: r.analysis?.player.pos ?? null,
    pro_team: r.analysis?.player.proTeam ?? null,
    league_rank: r.analysis?.player.leagueRank ?? null,
    adp: r.analysis && r.analysis.player.adp < 9999 ? r.analysis.player.adp : null,
    reach_slots: r.analysis?.reachSlots ?? null,
    better_available: r.analysis?.betterAvailable ?? null,
    roast_text: r.roast?.text ?? null,
    roast_theme: r.roast?.theme ?? null,
    roast_fallback: r.roast?.fallback ?? false,
    is_sample: sample,
    updated_at: new Date().toISOString(),
  }))

  // Chunked: 180 rows in one statement is fine, but the runner also calls this
  // mid-draft and a smaller statement fails faster and more legibly.
  const CHUNK = 60
  let written = 0
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('draft_picks')
      .upsert(slice as never, { onConflict: 'season,overall_pick' })
    if (error) throw new Error(`publish failed at row ${i}: ${error.message}`)
    written += slice.length
  }
  return written
}

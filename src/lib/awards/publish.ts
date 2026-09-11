/**
 * The award release step the sync runs on every tick.
 *
 * Gathers what `decideRelease` needs, asks it, and generates whatever it names.
 * Almost every call is a no-op that answers "nothing due" after two cheap
 * reads, which is the same shape as the sync cadence and for the same reason:
 * a condition evaluated often beats a calendar entry fired once, because a
 * missed tick costs minutes instead of a whole week.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { decideRelease } from './release'
import { generateWeeklyAwards, type GenerateResult } from './generate'
import type { AwardMatchup, AwardPlayer } from './compute'

export interface PublishResult {
  ok: boolean
  reason: string
  generated: GenerateResult[]
  error?: string
}

export async function publishDueAwards(
  seasonId: number,
  now: Date,
): Promise<PublishResult> {
  const db = createServiceClient()

  try {
    const [matchupRes, awardRes] = await Promise.all([
      db.from('matchups')
        .select('id, week, home_team_id, away_team_id, home_score, away_score, status, home_projected_score, away_projected_score')
        .eq('season_id', seasonId),
      db.from('awards').select('week').eq('season_id', seasonId),
    ])
    if (matchupRes.error) throw new Error(`matchups read failed: ${matchupRes.error.message}`)
    if (awardRes.error) throw new Error(`awards read failed: ${awardRes.error.message}`)

    const matchups = matchupRes.data ?? []

    // A week counts as finished only when EVERY one of its matchups is final.
    // Any looser test releases a week while a game is still being played.
    const byWeek = new Map<number, { total: number; final: number }>()
    for (const m of matchups) {
      if (m.week == null) continue
      const acc = byWeek.get(m.week) ?? { total: 0, final: 0 }
      acc.total += 1
      if (m.status === 'FINAL') acc.final += 1
      byWeek.set(m.week, acc)
    }
    const finalWeeks = [...byWeek.entries()]
      .filter(([, acc]) => acc.total > 0 && acc.total === acc.final)
      .map(([week]) => week)
      .sort((a, b) => a - b)

    const generatedWeeks = [...new Set(
      (awardRes.data ?? []).map((r) => r.week).filter((w): w is number => w != null),
    )]

    const decision = decideRelease({ now, finalWeeks, generatedWeeks })
    if (decision.weeks.length === 0) {
      return { ok: true, reason: decision.reason, generated: [] }
    }

    const generated: GenerateResult[] = []
    for (const week of decision.weeks) {
      const awardMatchups: AwardMatchup[] = matchups
        .filter((m) => m.week != null)
        .map((m) => ({
          matchupId: m.id,
          week: m.week as number,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          homeScore: Number(m.home_score),
          awayScore: Number(m.away_score),
          status: m.status,
          homeProjected: m.home_projected_score == null ? null : Number(m.home_projected_score),
          awayProjected: m.away_projected_score == null ? null : Number(m.away_projected_score),
        }))

      const { data: scores, error } = await db
        .from('player_week_scores')
        .select('season_team_id, is_starter, actual_points, projected_points, players ( espn_player_id, full_name, position, nfl_team )')
        .eq('season_id', seasonId)
        .eq('week', week)
      if (error) throw new Error(`player_week_scores read failed: ${error.message}`)

      type Row = {
        season_team_id: number; is_starter: boolean
        actual_points: number | null; projected_points: number | null
        players: { espn_player_id: number | null; full_name: string | null; position: string | null; nfl_team: string | null } | null
      }

      const players: AwardPlayer[] = (scores as unknown as Row[] ?? [])
        .filter((r) => r.players?.espn_player_id != null)
        .map((r) => ({
          seasonTeamId: r.season_team_id,
          espnPlayerId: r.players!.espn_player_id as number,
          name: r.players!.full_name ?? 'Unknown player',
          position: r.players!.position ?? '',
          nflTeam: r.players!.nfl_team ?? '',
          isStarter: r.is_starter,
          actualPoints: r.actual_points == null ? null : Number(r.actual_points),
          projectedPoints: r.projected_points == null ? null : Number(r.projected_points),
        }))

      generated.push(await generateWeeklyAwards(seasonId, week, awardMatchups, players))
    }

    const failed = generated.find((g) => !g.ok)
    return {
      ok: !failed,
      reason: decision.reason,
      generated,
      error: failed?.error,
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'release check failed',
      generated: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

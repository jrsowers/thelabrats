/**
 * Snapshot capture.
 *
 * THE POINT: history not recorded as it happens cannot be reconstructed later.
 * ESPN exposes the current state, never "what the score was at 3:42pm". Every
 * feature that depends on the shape of a week — biggest comeback, blown lead,
 * live win probability, standings movement across a season — needs these rows
 * to have been written at the time.
 *
 * This is why it ships before week 1 rather than when those features are built.
 *
 * Cost control (§14.7): snapshots are written on a meaningful score change or a
 * periodic checkpoint, never on every poll. A minute-by-minute record of a
 * Sunday would be ~600 rows per matchup for no added insight.
 */
import { createServiceClient } from '@/lib/supabase/server'

/** A score must move by at least this much to be worth a new row. */
const SIGNIFICANT_POINTS = 3
/** ...or this much time must have passed since the last one. */
const CHECKPOINT_MS = 10 * 60_000

export interface SnapshotResult {
  matchupSnapshots: number
  standingsSnapshots: number
}

export async function captureSnapshots(seasonId: number): Promise<SnapshotResult> {
  const db = createServiceClient()
  let matchupSnapshots = 0

  // --- Live matchups: capture the shape of the game as it happens ---
  const { data: live } = await db
    .from('matchups')
    .select('id, home_score, away_score, home_projected_score, away_projected_score')
    .eq('season_id', seasonId)
    .eq('status', 'LIVE')

  for (const m of live ?? []) {
    const { data: last } = await db
      .from('matchup_snapshots')
      .select('home_score, away_score, captured_at')
      .eq('matchup_id', m.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const moved = last
      ? Math.abs(Number(m.home_score) - Number(last.home_score)) >= SIGNIFICANT_POINTS ||
        Math.abs(Number(m.away_score) - Number(last.away_score)) >= SIGNIFICANT_POINTS
      : true

    const stale = last
      ? Date.now() - new Date(last.captured_at).getTime() >= CHECKPOINT_MS
      : true

    if (!moved && !stale) continue

    const { error } = await db.from('matchup_snapshots').insert({
      matchup_id: m.id,
      home_score: m.home_score,
      away_score: m.away_score,
      home_projected_score: m.home_projected_score,
      away_projected_score: m.away_projected_score,
    })
    if (!error) matchupSnapshots++
  }

  // --- Standings: one row per team per completed week ---
  // Written once per week rather than continuously: the standings only change
  // when a week finalizes, and week-over-week movement is what they are for.
  const standingsSnapshots = await captureStandingsSnapshot(seasonId)

  return { matchupSnapshots, standingsSnapshots }
}

async function captureStandingsSnapshot(seasonId: number): Promise<number> {
  const db = createServiceClient()

  const { data: matchups } = await db
    .from('matchups')
    .select('matchup_period, home_team_id, away_team_id, home_score, away_score, status')
    .eq('season_id', seasonId)

  const finals = (matchups ?? []).filter((m) => m.status === 'FINAL')
  if (finals.length === 0) return 0

  const week = finals.reduce((max, m) => Math.max(max, m.matchup_period), 0)

  // Already captured for this week? Standings do not change afterwards.
  const { count } = await db
    .from('standings_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .eq('week', week)
  if ((count ?? 0) > 0) return 0

  // Only capture once every matchup in the week is final — a partial week
  // would record a standings row that never actually existed.
  const weekGames = (matchups ?? []).filter((m) => m.matchup_period === week)
  if (weekGames.some((m) => m.status !== 'FINAL')) return 0

  const totals = new Map<number, {
    wins: number; losses: number; ties: number; pf: number; pa: number
  }>()
  const bump = (id: number | null) => {
    if (id == null) return null
    if (!totals.has(id)) totals.set(id, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0 })
    return totals.get(id)!
  }

  for (const m of finals) {
    if (m.matchup_period > week) continue
    const h = bump(m.home_team_id)
    const a = bump(m.away_team_id)
    const hs = Number(m.home_score)
    const as = Number(m.away_score)
    if (h) { h.pf += hs; h.pa += as; if (hs > as) h.wins++; else if (hs < as) h.losses++; else h.ties++ }
    if (a) { a.pf += as; a.pa += hs; if (as > hs) a.wins++; else if (as < hs) a.losses++; else a.ties++ }
  }

  const ranked = [...totals.entries()]
    .map(([teamId, t]) => ({ teamId, ...t, pct: (t.wins + t.ties * 0.5) / Math.max(1, t.wins + t.losses + t.ties) }))
    .sort((x, y) => y.pct - x.pct || y.pf - x.pf)

  const { data } = await db.from('standings_snapshots').insert(
    ranked.map((r, i) => ({
      season_id: seasonId,
      week,
      season_team_id: r.teamId,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      points_for: r.pf,
      points_against: r.pa,
      seed: i + 1,
    })),
  ).select('id')

  return data?.length ?? 0
}

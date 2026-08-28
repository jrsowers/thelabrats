/**
 * Admin-only reads. These use the SECRET key, not the public one — sync_runs is
 * deliberately not readable by anonymous visitors, because error messages can
 * carry internal detail (URLs, payload fragments).
 */
import { createServiceClient } from '@/lib/supabase/server'

export interface SyncHealth {
  syncType: string
  status: string
  startedAt: string
  finishedAt: string | null
  records: number
  error: string | null
  durationMs: number | null
}

export async function getSyncHistory(limit = 25): Promise<SyncHealth[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('sync_runs')
    .select('sync_type, status, started_at, finished_at, records_processed, error_message')
    .order('started_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => ({
    syncType: r.sync_type,
    status: r.status,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    records: r.records_processed,
    error: r.error_message,
    durationMs: r.finished_at
      ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
      : null,
  }))
}

export interface TableCount { table: string; rows: number }

/** Row counts, so an empty table that should not be empty is visible at a glance. */
export async function getTableCounts(): Promise<TableCount[]> {
  const db = createServiceClient()
  const tables = [
    'franchises', 'season_teams', 'players', 'matchups', 'player_week_scores',
    'transactions', 'matchup_snapshots', 'standings_snapshots', 'awards', 'champions',
  ] as const

  const counts = await Promise.all(
    tables.map(async (t) => {
      const { count } = await db.from(t).select('id', { count: 'exact', head: true })
      return { table: t, rows: count ?? 0 }
    }),
  )
  return counts
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createEspnClientFromEnv } from '@/lib/espn/client'
import { syncLeague } from '@/lib/ingest/syncLeague'
import { syncPlayers } from '@/lib/ingest/syncPlayers'
import { decideSync } from '@/lib/sync/cadence'

export const dynamic = 'force-dynamic'
// Sync is a handful of ESPN calls plus upserts; well inside Vercel's ceiling,
// but the default 10s is tight if ESPN is slow.
export const maxDuration = 60

/**
 * Scheduled sync. Called by pg_cron via pg_net every 2 minutes.
 *
 * The cron fires on a fixed cadence and THIS decides whether there is work to
 * do — see lib/sync/cadence.ts for why that beats encoding game windows in a
 * cron expression. Most invocations are no-ops that return in milliseconds.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')

  // Constant-ish comparison; the endpoint mutates the database, so an
  // unauthenticated caller must learn nothing from the response.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'

  // What has run, and is anything live right now?
  const [{ data: lastLive }, { data: lastRoutine }, { data: liveMatchups }, { data: season }] =
    await Promise.all([
      db.from('sync_runs').select('finished_at').eq('sync_type', 'live-scoring')
        .eq('status', 'SUCCESS').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('sync_runs').select('finished_at').eq('sync_type', 'league-metadata')
        .eq('status', 'SUCCESS').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('matchups').select('id').eq('status', 'LIVE').limit(1),
      db.from('seasons').select('status, draft_completed').order('year', { ascending: false })
        .limit(1).maybeSingle(),
    ])

  const decision = force
    ? { action: 'ROUTINE' as const, reason: 'forced' }
    : decideSync({
        now: new Date(),
        hasLiveMatchup: (liveMatchups?.length ?? 0) > 0,
        lastLiveSyncAt: lastLive?.finished_at ? new Date(lastLive.finished_at) : null,
        lastRoutineSyncAt: lastRoutine?.finished_at ? new Date(lastRoutine.finished_at) : null,
        // Preseason still counts as active: the draft, roster moves and the
        // player pool all change before week 1.
        seasonActive: season?.status !== 'COMPLETE',
      })

  if (decision.action === 'IDLE') {
    return NextResponse.json({ action: 'IDLE', reason: decision.reason })
  }

  const espn = createEspnClientFromEnv()
  const league = await syncLeague(decision.action === 'LIVE' ? 'live-scoring' : 'league-metadata')

  // The player pool is large and changes slowly — refresh it on routine syncs
  // only, never in the middle of a live scoring pass.
  let players: number | null = null
  if (decision.action === 'ROUTINE') {
    const result = await syncPlayers(espn)
    players = result.ok ? result.players : null
    if (!result.ok) console.error('player sync failed:', result.error)
  }

  return NextResponse.json({
    action: decision.action,
    reason: decision.reason,
    league: { ok: league.ok, records: league.recordsProcessed, detail: league.detail },
    players,
  }, { status: league.ok ? 200 : 500 })
}

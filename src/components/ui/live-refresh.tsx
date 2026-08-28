'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps a server-rendered page current without a manual reload.
 *
 * Uses router.refresh() rather than a Supabase Realtime subscription. Realtime
 * would be more elegant, but it needs a table publication, a WebSocket per
 * viewer, and reconnection handling — for data that changes at most once a
 * minute, for twelve people. Polling the app's own server is simpler and has
 * fewer ways to fail. Spec §36 explicitly allows this as the MVP approach.
 *
 * Critically, router.refresh() re-renders in place: React reconciles the new
 * server output against the existing tree, so scores update without the
 * scoreboard ever blanking (§37). A location.reload() would flash.
 *
 * Nothing is fetched from ESPN here — this reads our own database, which the
 * scheduled sync keeps fresh. Every viewer refreshing costs ESPN nothing.
 */
export function LiveRefresh({
  intervalMs = 30_000,
  active = true,
}: { intervalMs?: number; active?: boolean }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    if (!active) return

    const refresh = () => {
      // Don't poll a page nobody is looking at.
      if (document.visibilityState !== 'visible') return
      startTransition(() => {
        router.refresh()
        setLastRefresh(Date.now())
      })
    }

    const id = setInterval(refresh, intervalMs)
    // Catch up immediately when a tab comes back after being hidden.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, intervalMs, active])

  // Tick the "updated Ns ago" label independently of the refresh itself.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setSecondsAgo(lastRefresh ? Math.round((Date.now() - lastRefresh) / 1000) : 0)
    }, 1000)
    return () => clearInterval(id)
  }, [lastRefresh, active])

  if (!active) return null

  return (
    <span
      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-dim"
      /* Polite, not assertive: this must not interrupt a screen reader mid-sentence. */
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="live-dot inline-block size-1.5 rounded-full bg-live" aria-hidden />
      {lastRefresh === null
        ? 'Auto-updating'
        : secondsAgo < 5 ? 'Updated just now' : `Updated ${secondsAgo}s ago`}
    </span>
  )
}

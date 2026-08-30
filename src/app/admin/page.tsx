import type { Metadata } from 'next'
import { getLeagueOverview } from '@/lib/league/queries'
import { getSyncHistory, getTableCounts } from '@/lib/league/admin'
import { AppShell } from '@/components/navigation/app-shell'
import { Eyebrow, Tag, EmptyState } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Admin',
  // Operational page — keep it out of search results.
  robots: { index: false, follow: false },
}

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        second: '2-digit', timeZone: 'America/New_York',
      }).format(new Date(iso))
    : '—'

const ago = (iso: string | null) => {
  if (!iso) return null
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default async function AdminPage({
  searchParams,
}: { searchParams: Promise<{ synced?: string; failed?: string; error?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const [history, counts] = await Promise.all([getSyncHistory(20), getTableCounts()])

  const latest = history[0] ?? null
  const recentFailures = history.filter((h) => h.status === 'FAILED').length
  const healthy = latest?.status === 'SUCCESS' && recentFailures === 0

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="mb-7 border-b border-border pb-5">
        <Eyebrow>Admin · Not linked in navigation</Eyebrow>
        <h1 className="display mt-1.5 text-[38px] sm:text-[46px]">The Control Room</h1>
      </header>

      {params.synced && (
        <div className="mb-5 rounded-lg border border-live/40 bg-live-soft px-4 py-3 text-[13.5px]">
          Sync completed. Figures below are current.
        </div>
      )}
      {(params.failed || params.error) && (
        <div className="mb-5 rounded-lg border border-loss/40 bg-loss-soft px-4 py-3 text-[13.5px]">
          {params.error ? 'Wrong key — nothing ran.' : 'Sync failed. See the run log below.'}
        </div>
      )}

      {/* ---- Health ---- */}
      <section className="mb-9">
        <div className="mb-3 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Health</h2>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <div
            className="state-bar rounded-lg border border-border bg-surface px-4 py-3"
            style={{ '--state': healthy ? 'var(--live)' : 'var(--loss)' } as React.CSSProperties}
          >
            <Eyebrow>Status</Eyebrow>
            <div className="display mt-1 text-[24px]">
              {healthy ? 'Healthy' : recentFailures > 0 ? 'Failures' : 'Unknown'}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {recentFailures > 0
                ? `${recentFailures} failed in the last ${history.length} runs`
                : 'No failures in recent runs'}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <Eyebrow>Last sync</Eyebrow>
            <div className="display mt-1 text-[24px] tnum">
              {ago(latest?.finishedAt ?? null) ?? '—'}
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-dim">
              {latest?.syncType ?? 'never run'}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            <Eyebrow>Schedule</Eyebrow>
            <div className="display mt-1 text-[24px]">Every 2 min</div>
            <div className="mt-0.5 text-xs text-muted">pg_cron decides nothing; the app does</div>
          </div>
        </div>
      </section>

      {/* ---- Manual sync ---- */}
      <section className="mb-9">
        <div className="mb-3 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Sync ESPN Now</h2>
        </div>
        <form
          action="/api/admin/sync"
          method="post"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface px-4 py-4"
        >
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="key" className="eyebrow mb-1.5 block">Admin key</label>
            <input
              id="key"
              name="key"
              type="password"
              autoComplete="off"
              required
              placeholder="CRON_SECRET"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] text-text outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="tap-target rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
          >
            Run sync
          </button>
          <p className="w-full text-[11.5px] text-dim">
            Same key as the scheduler. Sent as a form field, so it never appears in browser
            history or server logs.
          </p>
        </form>
      </section>

      {/* ---- Data ---- */}
      <section className="mb-9">
        <div className="mb-3 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Data</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {counts.map((c) => (
            <div
              key={c.table}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5"
            >
              <span className="font-mono text-[11.5px] text-muted">{c.table}</span>
              <span className={`display text-[19px] tnum ${c.rows === 0 ? 'text-dim' : ''}`}>
                {c.rows.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Run log ---- */}
      <section>
        <div className="mb-3 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Run Log</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          {history.length === 0 ? (
            <div className="bg-surface"><EmptyState title="No syncs recorded yet." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="eyebrow px-4 py-2.5">Type</th>
                    <th className="eyebrow px-2 py-2.5">Status</th>
                    <th className="eyebrow px-2 py-2.5 text-right">Records</th>
                    <th className="eyebrow px-2 py-2.5 text-right">Took</th>
                    <th className="eyebrow px-4 py-2.5 text-right">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-b border-border bg-surface last:border-0">
                      <td className="px-4 py-2 font-mono text-[12px]">{h.syncType}</td>
                      <td className="px-2 py-2">
                        <Tag tone={h.status === 'SUCCESS' ? 'win' : h.status === 'FAILED' ? 'loss' : 'neutral'}>
                          {h.status}
                        </Tag>
                        {h.error && (
                          <div className="mt-1 max-w-[280px] truncate font-mono text-[10px] text-loss" title={h.error}>
                            {h.error}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-[12px] tnum">{h.records}</td>
                      <td className="px-2 py-2 text-right font-mono text-[12px] tnum text-muted">
                        {h.durationMs != null ? `${(h.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11.5px] tnum text-muted">
                        {fmt(h.finishedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}

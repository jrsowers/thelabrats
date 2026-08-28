import Link from 'next/link'
import {
  getLeagueOverview, getMatchupsForWeek, getPastChampions, getLastSync,
  type MatchupRow,
} from '@/lib/league/queries'
import { LINEUP_SLOT_LABEL } from '@/lib/espn/constants'
import { isSupabaseConfigured } from '@/lib/supabase/server'

// Live-ish data: never cache the page itself. Freshness comes from ingestion.
export const dynamic = 'force-dynamic'

const TZ = 'America/New_York'

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short',
  }).format(new Date(iso))
}

function TeamCell({
  side,
  align = 'left',
}: {
  side: MatchupRow['home']
  align?: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="truncate text-sm font-semibold sm:text-base">{side?.name ?? 'TBD'}</div>
      {side?.manager && <div className="truncate text-xs text-muted">{side.manager}</div>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tnum">{value}</div>
    </div>
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const overview = await getLeagueOverview()

  if (!overview) {
    const configured = isSupabaseConfigured()
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-2xl font-semibold">
          {configured ? 'No league data yet' : 'Setup required'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {configured
            ? 'The database is reachable but empty. Run an ESPN sync to populate it.'
            : 'Database credentials are not configured for this deployment.'}
        </p>
        {!configured && (
          <ul className="mt-4 space-y-1 text-sm text-muted">
            <li className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</li>
            <li className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          </ul>
        )}
      </main>
    )
  }

  const params = await searchParams
  const requested = Number(params.week)
  const week = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), overview.regularSeasonWeeks)
    : 1

  const [matchups, champions, lastSync] = await Promise.all([
    getMatchupsForWeek(week),
    getPastChampions(),
    getLastSync(),
  ])

  const starters = Object.entries(overview.lineupSlotCounts)
    .filter(([slot]) => Number(slot) !== 20 && Number(slot) !== 21)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .flatMap(([slot, n]) => Array.from({ length: n }, () => LINEUP_SLOT_LABEL[Number(slot)] ?? slot))

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      {/* Header */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{overview.leagueName}</h1>
            <p className="mt-1 text-sm text-muted">
              {overview.season} Season · {overview.teamCount} teams
            </p>
          </div>
          {lastSync?.finished_at && (
            <p className="text-xs text-muted tnum">
              Last synced {fmtDate(lastSync.finished_at)}
            </p>
          )}
        </div>
      </header>

      {/* Pre-draft banner */}
      {!overview.draftCompleted && overview.draftScheduledAt && (
        <section className="mt-6 rounded-lg border border-accent/30 bg-accent/5 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Draft not yet held
          </div>
          <div className="mt-1 text-lg font-semibold">{fmtDate(overview.draftScheduledAt)}</div>
          <p className="mt-1 text-sm text-muted">
            Rosters and scoring appear here once the draft completes.
          </p>
        </section>
      )}

      {/* League facts — read from ESPN, not hardcoded */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Regular season" value={`${overview.regularSeasonWeeks} weeks`} />
        <Stat label="Playoff teams" value={String(overview.playoffTeamCount)} />
        <Stat label="Seeding" value={overview.seedingRule?.replace(/_/g, ' ') ?? '—'} />
        <Stat label="Waivers" value={overview.usesFaab ? 'FAAB' : 'Traditional'} />
      </section>

      {/* Schedule */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Schedule</h2>
          <nav className="flex items-center gap-1" aria-label="Week selection">
            <Link
              href={`/?week=${Math.max(1, week - 1)}`}
              aria-disabled={week === 1}
              className={`rounded px-2 py-1 text-sm ${week === 1 ? 'pointer-events-none text-muted/40' : 'text-muted hover:bg-surface-2 hover:text-foreground'}`}
            >
              ←
            </Link>
            <span className="min-w-[4.5rem] text-center text-sm font-semibold tnum">Week {week}</span>
            <Link
              href={`/?week=${Math.min(overview.regularSeasonWeeks, week + 1)}`}
              aria-disabled={week === overview.regularSeasonWeeks}
              className={`rounded px-2 py-1 text-sm ${week === overview.regularSeasonWeeks ? 'pointer-events-none text-muted/40' : 'text-muted hover:bg-surface-2 hover:text-foreground'}`}
            >
              →
            </Link>
          </nav>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          {matchups.length === 0 ? (
            <p className="bg-surface px-5 py-8 text-center text-sm text-muted">
              No matchups scheduled for week {week}.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {matchups.map((m) => (
                <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-surface px-4 py-3 sm:gap-6 sm:px-5">
                  <TeamCell side={m.away} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted tnum">
                    {m.status === 'SCHEDULED'
                      ? 'vs'
                      : `${m.away?.score.toFixed(1)}\u2013${m.home?.score.toFixed(1)}`}
                  </span>
                  <TeamCell side={m.home} align="right" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Lineup + champions */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Starting lineup</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {starters.map((slot, i) => (
              <span key={i} className="rounded border border-border bg-surface px-2 py-1 text-xs font-medium">
                {slot}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {starters.length} starters · {overview.lineupSlotCounts['20'] ?? 0} bench ·{' '}
            {overview.lineupSlotCounts['21'] ?? 0} IR
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Past champions</h2>
          {champions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No champions recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {champions.map((c) => (
                <li key={c.year} className="flex items-baseline gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                  <span className="text-sm font-semibold tnum text-accent">{c.year}</span>
                  <span className="text-sm font-medium">{c.manager}</span>
                  {c.note && <span className="ml-auto text-xs text-muted">{c.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="mt-12 border-t border-border pt-5 text-xs text-muted">
        ESPN is the system of record. This is the league&apos;s analytics and history layer.
      </footer>
    </main>
  )
}

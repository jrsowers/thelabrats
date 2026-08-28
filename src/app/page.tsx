import Link from 'next/link'
import {
  getLeagueOverview, getMatchupsForWeek, getTeamRecords, getLastSync,
} from '@/lib/league/queries'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { AppShell } from '@/components/navigation/app-shell'
import { MatchupRow } from '@/components/scoreboard/matchup-row'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { DraftCountdown } from '@/components/ui/draft-countdown'
import { Eyebrow, EmptyState, LabSeal } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

const TZ = 'America/New_York'

function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: TZ, timeZoneName: 'short', ...opts,
  }).format(new Date(iso))
}

/** Yahoo's card-header status line, derived from our own matchup states. */
function weekStatus(statuses: string[]) {
  if (statuses.length === 0) return null
  if (statuses.some((s) => s === 'LIVE')) return 'In progress'
  if (statuses.every((s) => s === 'FINAL')) return 'Final'
  return 'Not started yet'
}

export default async function Page({
  searchParams,
}: { searchParams: Promise<{ week?: string }> }) {
  const overview = await getLeagueOverview()

  if (!overview) {
    const configured = isSupabaseConfigured()
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <LabSeal size={96} />
        <h1 className="display mt-6 text-3xl">
          {configured ? 'No league data' : 'Setup required'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {configured
            ? 'The database is reachable but empty. Run an ESPN sync to populate it.'
            : 'Database credentials are not configured for this deployment.'}
        </p>
      </main>
    )
  }

  const params = await searchParams
  const requested = Number(params.week)
  // No ?week= means "wherever the season actually is", from ESPN's
  // mStatus.currentMatchupPeriod — never a hardcoded 1.
  const week = Math.min(
    Math.max(Number.isFinite(requested) ? requested : overview.currentWeek, 1),
    overview.regularSeasonWeeks,
  )
  const isCurrentWeek = week === overview.currentWeek

  const records = await getTeamRecords(overview.seasonId)
  const [matchups, lastSync] = await Promise.all([
    getMatchupsForWeek(week, records),
    getLastSync(),
  ])

  const status = weekStatus(matchups.map((m) => m.status))

  return (
    <AppShell leagueName={overview.leagueName} season={overview.season}>
      {/* ---- Header ---- */}
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>Live Scoreboard · Week {week}</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Lab Rats</h1>
            <p className="mt-1.5 text-sm text-muted">
              {overview.season} season · {overview.teamCount} Contenders · 1 Champion
            </p>
          </div>
          {lastSync?.finished_at && (
            <p className="font-mono text-[10.5px] text-dim tnum">
              <span className="font-bold text-muted">Last data sync:</span>{' '}
              {fmtDate(lastSync.finished_at)}
            </p>
          )}
        </div>
      </header>

      {/* ---- Draft countdown ---- */}
      {!overview.draftCompleted && overview.draftScheduledAt && (
        <section className="mb-8 overflow-hidden rounded-lg border border-brand/30 bg-brand-soft">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 px-5 py-4">
            <div className="min-w-0">
              <Eyebrow className="!text-brand">Draft Day</Eyebrow>
              <div className="display mt-1 text-[26px]">
                {fmtDate(overview.draftScheduledAt, { weekday: 'long' })}
              </div>
            </div>
            <DraftCountdown target={overview.draftScheduledAt} />
          </div>
        </section>
      )}

      {/* ---- Scoreboard ---- */}
      <section>
        <div className="overflow-hidden rounded-lg border border-border">
          {/* Card header — Yahoo's pattern: week identity left, state right. */}
          <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-2 px-4 py-2.5 sm:px-5">
            <div className="flex items-baseline gap-2.5">
              <h2 className="display text-lg">Week {week}</h2>
              {isCurrentWeek && (
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                  Current
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {status && (
                <span className="hidden font-mono text-[10.5px] uppercase tracking-wider text-muted sm:inline">
                  {status}
                </span>
              )}
              <nav className="flex items-center gap-1" aria-label="Week selection">
                <Link
                  href={`/?week=${Math.max(1, week - 1)}`}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider ${week === 1 ? 'pointer-events-none text-dim/40' : 'text-muted hover:bg-surface-3 hover:text-text'}`}
                >
                  <span aria-hidden>←</span>
                  <span className="hidden sm:inline">Prev Week</span>
                  <span className="sr-only sm:hidden">Previous week</span>
                </Link>
                <Link
                  href={`/?week=${Math.min(overview.regularSeasonWeeks, week + 1)}`}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider ${week === overview.regularSeasonWeeks ? 'pointer-events-none text-dim/40' : 'text-muted hover:bg-surface-3 hover:text-text'}`}
                >
                  <span className="hidden sm:inline">Next Week</span>
                  <span className="sr-only sm:hidden">Next week</span>
                  <span aria-hidden>→</span>
                </Link>
              </nav>
            </div>
          </div>

          {matchups.length === 0 ? (
            <div className="bg-surface">
              <EmptyState title={`No matchups scheduled for week ${week}.`} />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {matchups.map((m, i) => (
                <MatchupRow key={m.id} matchup={m} index={i} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  )
}

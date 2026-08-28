import Link from 'next/link'
import {
  getLeagueOverview, getMatchupsForWeek, getPastChampions, getLastSync,
} from '@/lib/league/queries'
import { LINEUP_SLOT_LABEL } from '@/lib/espn/constants'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { AppShell } from '@/components/navigation/app-shell'
import { MatchupRow } from '@/components/scoreboard/matchup-row'
import {
  Eyebrow, SectionHeader, StatTile, Tag, EmptyState, LabSeal,
} from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

const TZ = 'America/New_York'

function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: TZ, timeZoneName: 'short', ...opts,
  }).format(new Date(iso))
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null
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
        {!configured && (
          <div className="mt-4 space-y-1 font-mono text-[11px] text-dim">
            <div>NEXT_PUBLIC_SUPABASE_URL</div>
            <div>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</div>
          </div>
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
    getMatchupsForWeek(week), getPastChampions(), getLastSync(),
  ])

  const starters = Object.entries(overview.lineupSlotCounts)
    .filter(([slot]) => Number(slot) !== 20 && Number(slot) !== 21)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .flatMap(([slot, n]) => Array.from({ length: n }, () => LINEUP_SLOT_LABEL[Number(slot)] ?? slot))

  const countdown = daysUntil(overview.draftScheduledAt)

  return (
    <AppShell leagueName={overview.leagueName} season={overview.season}>
      {/* ---- Header ---- */}
      <header className="field-lines -mx-4 mb-7 border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>Week {String(week).padStart(2, '0')} · Live Scoreboard</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Lab Rats</h1>
            <p className="mt-1.5 text-sm text-muted">
              {overview.season} season · {overview.teamCount} teams ·{' '}
              {overview.regularSeasonWeeks}-week regular season
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {!overview.draftCompleted && <Tag tone="warn">Preseason</Tag>}
            {lastSync?.finished_at && (
              <p className="font-mono text-[10.5px] text-dim tnum">
                Synced {fmtDate(lastSync.finished_at)}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ---- Draft countdown ---- */}
      {!overview.draftCompleted && overview.draftScheduledAt && (
        <section className="mb-7 overflow-hidden rounded-lg border border-brand/30 bg-brand-soft">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4">
            <div className="min-w-0">
              <Eyebrow className="!text-brand">Draft Day</Eyebrow>
              <div className="display mt-1 text-[26px]">
                {fmtDate(overview.draftScheduledAt, { weekday: 'long' })}
              </div>
              <p className="mt-1 text-xs text-muted">
                {overview.draftType ?? 'Snake'} draft · rosters and scoring go live after
              </p>
            </div>
            {countdown !== null && (
              <div className="ml-auto text-right">
                <div className="display text-[46px] leading-none text-brand tnum">{countdown}</div>
                <Eyebrow className="mt-1">{countdown === 1 ? 'Day out' : 'Days out'}</Eyebrow>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- League parameters ---- */}
      <section className="mb-8">
        <Eyebrow className="mb-2.5">League Parameters</Eyebrow>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile label="Regular Season" value={String(overview.regularSeasonWeeks)} sub="weeks" />
          <StatTile label="Playoff Berths" value={String(overview.playoffTeamCount)} sub="top 2 seeded bye" tone="brand" />
          <StatTile label="Seeding" value={overview.seedingRule?.replace(/_/g, ' ') ?? '—'} />
          <StatTile label="Waivers" value={overview.usesFaab ? 'FAAB' : 'Rolling'} sub={overview.usesFaab ? 'budget' : 'priority'} />
        </div>
      </section>

      {/* ---- Scoreboard ---- */}
      <section className="mb-8">
        <SectionHeader
          eyebrow={`${matchups.length} matchups`}
          title="Scoreboard"
          action={
            <nav className="flex items-center gap-0.5" aria-label="Week selection">
              <Link
                href={`/?week=${Math.max(1, week - 1)}`}
                aria-label="Previous week"
                className={`rounded px-2 py-1 font-mono text-xs ${week === 1 ? 'pointer-events-none text-dim/40' : 'text-muted hover:bg-surface-2 hover:text-text'}`}
              >
                ←
              </Link>
              <span className="display min-w-[5.5rem] text-center text-lg tnum">Week {week}</span>
              <Link
                href={`/?week=${Math.min(overview.regularSeasonWeeks, week + 1)}`}
                aria-label="Next week"
                className={`rounded px-2 py-1 font-mono text-xs ${week === overview.regularSeasonWeeks ? 'pointer-events-none text-dim/40' : 'text-muted hover:bg-surface-2 hover:text-text'}`}
              >
                →
              </Link>
            </nav>
          }
        />
        <div className="overflow-hidden rounded-lg border border-border">
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

      {/* ---- Roster construction + champions ---- */}
      <section className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <SectionHeader eyebrow="Roster construction" title="Starting Lineup" />
          <div className="flex flex-wrap gap-1.5">
            {starters.map((slot, i) => (
              <span
                key={i}
                className="rounded-[3px] border border-border bg-surface px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
              >
                {slot}
              </span>
            ))}
          </div>
          <p className="mt-2.5 font-mono text-[11px] text-dim">
            {starters.length} starters · {overview.lineupSlotCounts['20'] ?? 0} bench ·{' '}
            {overview.lineupSlotCounts['21'] ?? 0} IR
          </p>
        </div>

        <div className="md:col-span-2">
          <SectionHeader eyebrow="Record book" title="Champions" />
          {champions.length === 0 ? (
            <p className="text-sm text-muted">No champions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {champions.map((c) => (
                <li
                  key={c.year}
                  className="state-bar flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  style={{ '--state': 'var(--warn)' } as React.CSSProperties}
                >
                  <span className="display text-xl text-warn tnum">{c.year}</span>
                  <span className="display truncate text-[17px]">{c.manager}</span>
                  {c.note && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-dim">
                      {c.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
} from '@/lib/league/queries'
import { latestCompletedWeek } from '@/lib/standings/compute'
import {
  computeWeeklyAwards, computeAwardLeaderboard, AWARD_CATALOG, type Award,
} from '@/lib/awards/compute'
import { simulateSeason } from '@/lib/league/preview'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, TeamAvatar, Tag, EmptyState } from '@/components/ui/primitives'
import type { StandingsTeam } from '@/lib/league/queries'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Studs & Duds' }

/** Awards that celebrate vs awards that indict — drives the card's accent. */
const TONE: Record<string, 'good' | 'bad' | 'neutral'> = {
  MANAGER_OF_THE_WEEK: 'good',
  SHOOTOUT: 'good',
  PHOTO_FINISH: 'neutral',
  HIGHWAY_ROBBERY: 'neutral',
  BAD_BEAT: 'bad',
  PUBLIC_EXECUTION: 'bad',
  DUMPSTER_FIRE: 'bad',
}

const ACCENT = {
  good: 'var(--live)',
  bad: 'var(--loss)',
  neutral: 'var(--brand)',
} as const

function AwardCard({
  award, teams,
}: { award: Award; teams: Map<number, StandingsTeam> }) {
  const tone = TONE[award.type] ?? 'neutral'
  const recipients = award.teamIds.map((id) => teams.get(id)).filter(Boolean) as StandingsTeam[]

  return (
    <article
      className="state-bar flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
      style={{ '--state': ACCENT[tone] } as React.CSSProperties}
    >
      <div className="border-b border-border px-4 py-2.5">
        <Eyebrow>{award.name}</Eyebrow>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          {recipients.slice(0, 2).map((t) => (
            <TeamAvatar
              key={t.seasonTeamId}
              photoUrl={t.photoUrl}
              logoUrl={t.logoUrl}
              abbrev={t.abbrev}
              size={32}
              champion={t.isChampion}
              championYear={t.championYear}
            />
          ))}
          <div className="min-w-0">
            <div className="display truncate text-[16px] leading-tight">
              {recipients[0]?.name ?? 'Unknown'}
              {recipients.length > 1 && (
                <span className="text-muted"> vs {recipients[1]?.name}</span>
              )}
            </div>
            {recipients[0]?.manager && (
              <div className="truncate text-[11px] text-muted">{recipients[0].manager}</div>
            )}
          </div>
        </div>

        <p className="text-[13.5px] leading-relaxed text-muted">{award.headline}</p>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-3">
          <div>
            <Eyebrow>{award.metric.label}</Eyebrow>
            <div
              className="display mt-0.5 text-[30px] tnum"
              style={{ color: ACCENT[tone] }}
            >
              {award.metric.value}
            </div>
          </div>
          <dl className="text-right">
            {award.supporting.map((s) => (
              <div key={s.label}>
                <dt className="font-mono text-[9.5px] uppercase tracking-wider text-dim">{s.label}</dt>
                <dd className="font-mono text-[12.5px] tnum">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  )
}

export default async function AwardsPage({
  searchParams,
}: { searchParams: Promise<{ preview?: string; week?: string; view?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'
  const view = params.view === 'season' ? 'season' : 'week'

  const champion = await getReigningChampion()
  const [teams, rawResults] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
  ])
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const previewWeek = Math.min(Math.max(Number(params.week) || 8, 1), overview.regularSeasonWeeks)
  const results = isPreview ? simulateSeason(rawResults, previewWeek) : rawResults

  const throughWeek = latestCompletedWeek(
    results.map((m) => ({ ...m, week: m.week, status: m.status })),
  )

  const awardMatchups = results.map((m, i) => ({
    matchupId: i + 1,
    week: m.week,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
  }))

  const weekAwards = computeWeeklyAwards(awardMatchups, throughWeek)
  const leaderboard = computeAwardLeaderboard(awardMatchups, throughWeek)
  const blocked = AWARD_CATALOG.filter((a) => a.blocked)

  const qs = (next: Record<string, string>) => {
    const p = new URLSearchParams()
    if (isPreview) p.set('preview', 'live')
    if (isPreview) p.set('week', String(previewWeek))
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k)
    const s = p.toString()
    return s ? `/awards?${s}` : '/awards'
  }

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <Eyebrow>
            Studs &amp; Duds{throughWeek > 0 ? ` · Week ${throughWeek}` : ''}
          </Eyebrow>
          <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">Credit &amp; Blame</h1>
        </div>
      </header>

      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Preview</Tag>
          <p className="text-[13px] text-muted">
            Awards computed from a simulated season through week {previewWeek}.
          </p>
          <div className="ml-auto flex items-center gap-1">
            {[4, 8, 12].map((w) => (
              <Link
                key={w}
                href={`/awards?preview=live&week=${w}${view === 'season' ? '&view=season' : ''}`}
                className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] tnum ${
                  w === previewWeek ? 'bg-brand text-brand-ink' : 'text-muted hover:bg-surface-2'
                }`}
              >
                Wk {w}
              </Link>
            ))}
            <Link href="/awards" className="ml-2 font-mono text-[10.5px] uppercase tracking-wider text-brand hover:underline">
              Exit →
            </Link>
          </div>
        </div>
      )}

      {/* View switch (§22.1) */}
      <nav className="mb-5 flex items-center gap-1 border-b border-border" aria-label="Award view">
        {([['week', 'This Week'], ['season', 'Season Tally']] as const).map(([key, label]) => (
          <Link
            key={key}
            href={qs({ view: key === 'week' ? '' : key })}
            aria-current={view === key ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              view === key ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {throughWeek === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            title="No awards yet."
            hint="Studs & Duds are calculated once week 1 scoring is final."
          />
        </div>
      ) : view === 'week' ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {weekAwards.map((a) => (
            <AwardCard key={a.type} award={a} teams={byId} />
          ))}
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {[...leaderboard.entries()].map(([type, rows]) => {
            const meta = AWARD_CATALOG.find((a) => a.type === type)
            return (
              <div key={type} className="rounded-lg border border-border bg-surface">
                <div className="border-b border-border px-4 py-2.5">
                  <Eyebrow>{meta?.name ?? type}</Eyebrow>
                </div>
                <ul className="divide-y divide-border">
                  {rows.slice(0, 5).map(({ teamId, count }) => {
                    const t = byId.get(teamId)
                    return (
                      <li key={teamId} className="flex items-center gap-2.5 px-4 py-2">
                        {t && (
                          <TeamAvatar
                            photoUrl={t.photoUrl} logoUrl={t.logoUrl} abbrev={t.abbrev}
                            size={24} champion={t.isChampion} championYear={t.championYear}
                          />
                        )}
                        <span className="display truncate text-[14px]">{t?.name ?? '—'}</span>
                        <span className="ml-auto display text-[17px] tnum">{count}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </section>
      )}

      {/* Honest about what is not yet computable (§22.2, §38). */}
      {blocked.length > 0 && (
        <section className="mt-9">
          <div className="mb-3 border-b border-border pb-1.5">
            <h2 className="display text-2xl">Not Yet Awarded</h2>
          </div>
          <p className="mb-3 max-w-2xl text-[13px] text-muted">
            These need player-level scoring, which only exists once games are played.
            They will start appearing after week 1.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {blocked.map((a) => (
              <li key={a.type} className="rounded-lg border border-dashed border-border bg-surface-2/40 px-3.5 py-2.5">
                <div className="display text-[14.5px] text-muted">{a.name}</div>
                <div className="text-[11.5px] text-dim">{a.description}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  )
}

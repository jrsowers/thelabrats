import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
  getPlayerSample, type StandingsTeam,
} from '@/lib/league/queries'
import { simulateSeason } from '@/lib/league/preview'
import { buildAwardCards } from '@/lib/awards/build'
import { NEED_LABEL, CADENCE_LABEL, type AwardSection } from '@/lib/awards/catalog'
import type { AwardCard } from '@/lib/awards/placeholder'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { WeekSelect } from '@/components/ui/week-select'
import { Eyebrow, TeamAvatar, Tag } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Studs & Duds' }

const SECTION_ACCENT: Record<AwardSection, string> = {
  STUDS: 'var(--live)',
  DUDS: 'var(--loss)',
}

function Card({
  card, teams,
}: { card: AwardCard; teams: Map<number, StandingsTeam> }) {
  const accent = SECTION_ACCENT[card.def.section]
  const team = card.teamId != null ? teams.get(card.teamId) : null
  const opponent = card.opponentId != null ? teams.get(card.opponentId) : null

  return (
    <article
      className="state-bar flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
      style={{ '--state': accent } as React.CSSProperties}
    >
      {/* The award name is what people scan for, so it leads the card and
          outranks the recipient. The metric keeps its size but is set in the
          section accent, so the two read as different kinds of information
          rather than competing for the same rank. */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="display text-[21px] leading-[1.05]">{card.def.name}</h3>
        {card.placeholder && (
          <span
            className="mt-0.5 shrink-0 font-mono text-[8.5px] uppercase tracking-[0.14em] text-warn"
            title={
              `Needs: ${card.def.needs.map((n) => NEED_LABEL[n]).join(', ')}` +
              `\nCapture: ${CADENCE_LABEL[card.def.capture]}`
            }
          >
            Sample
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
        {/* Recipient: a player for player awards, otherwise the team(s). */}
        {card.playerName ? (
          <div>
            <div className="display text-[16px] leading-tight">{card.playerName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
              <span className="font-mono uppercase tracking-wider text-dim">{card.playerMeta}</span>
              {team && (
                <>
                  <span className="text-dim" aria-hidden>·</span>
                  <span className="truncate">{team.name}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {team && (
              <TeamAvatar
                photoUrl={team.photoUrl} logoUrl={team.logoUrl} abbrev={team.abbrev}
                size={28} champion={team.isChampion} championYear={team.championYear}
              />
            )}
            <div className="min-w-0">
              <div className="display truncate text-[15px] leading-tight">
                {team?.name ?? 'TBD'}
              </div>
              {opponent ? (
                <div className="truncate text-[11px] text-muted">vs {opponent.name}</div>
              ) : team?.manager ? (
                <div className="truncate text-[11px] text-muted">{team.manager}</div>
              ) : null}
            </div>
          </div>
        )}

        <p className="text-[13px] leading-relaxed text-muted">{card.headline}</p>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-3">
          <div>
            <Eyebrow>{card.def.metricLabel}</Eyebrow>
            <div className="display mt-0.5 text-[28px] tnum" style={{ color: accent }}>
              {card.metricValue}
            </div>
          </div>
          {card.supporting.length > 0 && (
            <dl className="text-right">
              {card.supporting.slice(0, 2).map((s) => (
                <div key={s.label} className="mt-0.5 first:mt-0">
                  <dt className="font-mono text-[9px] uppercase tracking-wider text-dim">{s.label}</dt>
                  <dd className="font-mono text-[12px] tnum">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </article>
  )
}

export default async function AwardsPage({
  searchParams,
}: { searchParams: Promise<{ week?: string; preview?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'

  // Defaults to the live week; ?week= lets anyone look back.
  const requested = Number(params.week)
  const week = Math.min(
    Math.max(Number.isFinite(requested) ? requested : overview.currentWeek, 1),
    overview.regularSeasonWeeks,
  )

  const champion = await getReigningChampion()
  const [teams, rawResults, players] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getPlayerSample(150),
  ])
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const results = isPreview ? simulateSeason(rawResults, overview.regularSeasonWeeks) : rawResults

  const awardMatchups = results.map((m, i) => ({
    matchupId: i + 1,
    week: m.week,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
  }))

  const cards = buildAwardCards(awardMatchups, week, {
    teamIds: teams.map((t) => t.seasonTeamId),
    players,
  })

  const studs = cards.filter((c) => c.def.section === 'STUDS')
  const duds = cards.filter((c) => c.def.section === 'DUDS')
  const sampleCount = cards.filter((c) => c.placeholder).length

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <Eyebrow>Studs &amp; Duds</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">
              Best &amp; Worst Performers
            </h1>
          </div>
          <WeekSelect
            week={week}
            weeks={overview.regularSeasonWeeks}
            currentWeek={overview.currentWeek}
            basePath="/awards"
            extraParams={isPreview ? { preview: 'live' } : {}}
          />
        </div>
      </header>

      {sampleCount > 0 && (
        <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Sample data</Tag>
          <p className="text-[13px] text-muted">
            {sampleCount} of {cards.length} awards show representative values. They need
            player-level scoring, which starts with week 1 — each is marked
            <span className="mx-1 font-mono text-[10px] uppercase tracking-wider text-warn">Sample</span>
            until then.
          </p>
        </div>
      )}

      {([
        ['STUDS', 'Studs Of The Week', studs],
        ['DUDS', 'Duds Of The Week', duds],
      ] as const).map(([key, heading, list]) => (
        <section key={key} className="mb-10">
          {/* Heading takes the normal text colour; the stud/dud distinction is
              already carried by each card's edge bar and metric. */}
          <div className="mb-5 border-b border-border pb-1.5">
            <h2 className="display text-2xl">{heading}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => (
              <Card key={c.def.key} card={c} teams={byId} />
            ))}
          </div>
        </section>
      ))}

      <p className="max-w-3xl font-mono text-[10px] leading-relaxed text-dim">
        Every award has a documented formula and is recomputed from stored data, never
        written by hand. Hover a <span className="text-warn">Sample</span> marker to see
        what that award is still waiting on.
      </p>
    </AppShell>
  )
}

import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
  getPlayerSample, getPlayerWeekScores, getLastSync, hasActiveGames, type StandingsTeam,
} from '@/lib/league/queries'
import { simulateSeason } from '@/lib/league/preview'
import { buildAwardCards } from '@/lib/awards/build'
import { awardsBySection, isComputable, type AwardSection } from '@/lib/awards/catalog'
import type { AwardCard } from '@/lib/awards/placeholder'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { WeekSelect } from '@/components/ui/week-select'
import { Eyebrow, TeamAvatar, Tag } from '@/components/ui/primitives'
import { AwardGrid } from '@/components/awards/award-grid'
import { SyncStatus } from '@/components/ui/sync-status'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Studs & Duds' }

const SECTION_ACCENT: Record<AwardSection, string> = {
  STUDS: 'var(--live)',
  DUDS: 'var(--loss)',
}

/** Header: always visible, even behind the frost. */
function CardHeader({ card }: { card: AwardCard }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h3 className="display text-[26px] leading-[1.02]">{card.def.name}</h3>
      <p className="mt-1 text-[12px] leading-snug text-muted">{card.def.blurb}</p>
    </div>
  )
}

/** Body: the answer. Blurred until the card is revealed. */
function CardBody({
  card, teams,
}: { card: AwardCard; teams: Map<number, StandingsTeam> }) {
  const accent = SECTION_ACCENT[card.def.section]
  const team = card.teamId != null ? teams.get(card.teamId) : null

  return (
    <>
      {/* The manager wins the award. Where a player earned it, the player
          appears beneath as evidence rather than as the recipient. */}
      <div className="flex items-center gap-2.5">
        {team && (
          <TeamAvatar
            photoUrl={team.photoUrl} logoUrl={team.logoUrl} abbrev={team.abbrev}
            size={38} champion={team.isChampion} championYear={team.championYear}
          />
        )}
        <div className="min-w-0">
          <div className="display truncate text-[16px] leading-tight">
            {team?.name ?? 'TBD'}
          </div>
          {team?.manager && (
            <div className="truncate text-[11.5px] text-muted">{team.manager}</div>
          )}
        </div>
      </div>

      {/* Commentary carries the player and opponent inline, in bold, instead
          of separate chips — every card then has the same shape. */}
      <p className="text-[13px] leading-relaxed text-muted">
        {card.commentary.map((seg, i) =>
          seg.bold
            ? <strong key={i} className="font-semibold text-text">{seg.text}</strong>
            : <span key={i}>{seg.text}</span>,
        )}
      </p>

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
    </>
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
  const [teams, rawResults, players, weekScores, lastSync, gamesActive] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getPlayerSample(150),
    getPlayerWeekScores(overview.seasonId, week),
    getLastSync(),
    hasActiveGames(overview.currentWeek),
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
    // Real projections belong to the real season. Laying them over a simulated
    // one would judge an invented result against a genuine forecast.
    homeProjected: isPreview ? null : rawResults[i]?.homeProjected ?? null,
    awayProjected: isPreview ? null : rawResults[i]?.awayProjected ?? null,
  }))

  // The simulator invents a season; laying real player lines over it would
  // credit a manager for a performance that did not happen in it.
  const awardPlayers = isPreview ? [] : weekScores

  const cards = buildAwardCards(
    awardMatchups,
    week,
    {
      teams: teams.map((t) => ({
        seasonTeamId: t.seasonTeamId, name: t.name, manager: t.manager,
      })),
      players,
    },
    awardPlayers,
  )

  // Catalog order: manager judgement, then matchups, then players.
  const order = new Map(
    (['STUDS', 'DUDS'] as const).flatMap((sec) =>
      awardsBySection(sec).map((def, i) => [def.key, i] as const)),
  )
  const inOrder = (section: AwardSection) =>
    cards
      .filter((c) => c.def.section === section)
      .sort((a, b) => (order.get(a.def.key) ?? 0) - (order.get(b.def.key) ?? 0))

  const studs = inOrder('STUDS')
  const duds = inOrder('DUDS')

  // Two different reasons a card is still a sample, and saying "needs player
  // scoring" for both stopped being true the moment player scoring landed.
  //   waiting — the engine computes this one, but the week is not over.
  //   pending — the data it needs is not collected yet at all.
  const placeholders = cards.filter((c) => c.placeholder)
  const waiting = placeholders.filter((c) => isComputable(c.def))
  const pending = placeholders.filter((c) => !isComputable(c.def))
  const weekIsFinal = results.some((m) => m.week === week && m.status === 'FINAL')

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
          <SyncStatus finishedAt={lastSync?.finished_at} autoRefresh={!isPreview && gamesActive} />
        </div>
      </header>

      {placeholders.length > 0 && (
        <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Sample data</Tag>
          <p className="text-[13px] text-muted">
            {placeholders.length} of {cards.length} awards show representative values, each
            marked
            <span className="ml-1 mr-0.5 font-mono text-[10px] uppercase tracking-wider text-warn">Sample</span>
            {'. '}
            {waiting.length > 0 && !weekIsFinal && (
              <>
                {pending.length > 0 ? `${waiting.length} are ` : 'They are '}
                waiting on the week to finish — a lowest winning score means nothing
                while games are still being played.{' '}
              </>
            )}
            {pending.length > 0 && (
              <>
                {waiting.length > 0 && !weekIsFinal ? `The other ${pending.length} need ` : 'They need '}
                the lineup optimizer and a transaction-to-scoring join, neither of which
                is built yet.
              </>
            )}
          </p>
        </div>
      )}

      <AwardGrid
        toolbar={
          <WeekSelect
            week={week}
            weeks={overview.regularSeasonWeeks}
            currentWeek={overview.currentWeek}
            basePath="/awards"
            extraParams={isPreview ? { preview: 'live' } : {}}
          />
        }
        sections={[
          {
            key: 'STUDS',
            heading: 'Studs Of The Week',
            items: studs.map((c) => ({
              key: c.def.key,
              accent: SECTION_ACCENT.STUDS,
              header: <CardHeader card={c} />,
              body: <CardBody card={c} teams={byId} />,
            })),
          },
          {
            key: 'DUDS',
            heading: 'Duds Of The Week',
            items: duds.map((c) => ({
              key: c.def.key,
              accent: SECTION_ACCENT.DUDS,
              header: <CardHeader card={c} />,
              body: <CardBody card={c} teams={byId} />,
            })),
          },
        ]}
      />
    </AppShell>
  )
}

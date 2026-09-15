import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
  getPlayerSample, getPlayerWeekScores, getLastSync, hasActiveGames,
  getPublishedAwards, getPublishedAwardWeeks, getPublishedPositionKings,
  type StandingsTeam,
} from '@/lib/league/queries'
import { simulateSeason } from '@/lib/league/preview'
import { buildAwardCards, type DecidedAward } from '@/lib/awards/build'
import { computeWeeklyAwards } from '@/lib/awards/compute'
import { RELEASE_HOUR_ET } from '@/lib/awards/release'
import { awardsBySection, isComputable, type AwardSection } from '@/lib/awards/catalog'
import type { AwardCard } from '@/lib/awards/placeholder'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { WeekSelect } from '@/components/ui/week-select'
import { Eyebrow, TeamAvatar, Tag } from '@/components/ui/primitives'
import { AwardGrid } from '@/components/awards/award-grid'
import { PositionKings } from '@/components/awards/position-kings'
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
          {/* A card may override the section accent when the SIGN of its
              number carries meaning — green over projection, red under. */}
          <div
            className="display mt-0.5 text-[28px] tnum"
            style={{ color: card.metricTone ? `var(--${card.metricTone})` : accent }}
          >
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

  // Awards are published once a week, after Monday Night Football. The page
  // therefore opens on the most recent PUBLISHED week, not the live one —
  // landing on a week whose awards do not exist yet shows an empty page during
  // the days most people visit. ?week= still reaches any week.
  const publishedWeeks = await getPublishedAwardWeeks(overview.seasonId)
  const latestPublished = publishedWeeks.at(-1) ?? overview.currentWeek

  const requested = Number(params.week)
  const week = Math.min(
    Math.max(Number.isFinite(requested) ? requested : latestPublished, 1),
    overview.regularSeasonWeeks,
  )

  const champion = await getReigningChampion()
  const [teams, rawResults, players, weekScores, published, kings, lastSync, gamesActive] =
    await Promise.all([
      getSeasonTeams(overview.seasonId, champion),
      getSeasonResults(overview.seasonId),
      getPlayerSample(150),
      getPlayerWeekScores(overview.seasonId, week),
      getPublishedAwards(overview.seasonId, week),
      getPublishedPositionKings(overview.seasonId, week),
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

  // Preview is the one place the engine still runs at request time: it exists
  // to judge the layout against an invented season, and there is nothing
  // published to read. Everything real comes from the awards table.
  const decided: DecidedAward[] = isPreview
    ? computeWeeklyAwards(awardMatchups, week, []).map((a) => ({ ...a, key: a.key }))
    : published

  const cards = buildAwardCards(decided, week, {
    teams: teams.map((t) => ({
      seasonTeamId: t.seasonTeamId, name: t.name, manager: t.manager,
    })),
    players,
  })

  // Nothing published for this week yet. Distinguish "Monday night has not
  // happened" from "nobody ever generated this", because only one of them
  // resolves on its own.
  const isUnpublished = !isPreview && published.length === 0
  const weekIsOver = results.some((m) => m.week === week)
    && results.filter((m) => m.week === week).every((m) => m.status === 'FINAL')

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

  // On an unpublished week every card is a placeholder, which gets its own
  // message. On a PUBLISHED one a placeholder means the engine found no
  // qualifying candidate — a week where nobody beat their projection has no
  // Nostradamus — unless the award still needs data nobody collects.
  const placeholders = cards.filter((c) => c.placeholder)
  const pending = placeholders.filter((c) => !isComputable(c.def))
  const uncontested = placeholders.filter((c) => isComputable(c.def))

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

      {isUnpublished ? (
        <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Not published</Tag>
          <p className="text-[13px] text-muted">
            Week {week} awards go up <strong className="text-text">Tuesday morning</strong>,
            once Monday Night Football is in the books.{' '}
            {weekIsOver
              ? 'The week is final — they publish on the next sync after '
                + `${RELEASE_HOUR_ET} AM Eastern Tuesday.`
              : 'The week is still being played.'}
            {' '}Every card below is a sample until then.
            {publishedWeeks.length > 0 && (
              <> The latest published week is {publishedWeeks.at(-1)}.</>
            )}
          </p>
        </div>
      ) : placeholders.length > 0 && (
        <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Sample data</Tag>
          <p className="text-[13px] text-muted">
            {placeholders.length} of {cards.length} awards show representative values, each
            marked
            <span className="ml-1 mr-0.5 font-mono text-[10px] uppercase tracking-wider text-warn">Sample</span>
            {'. '}
            {uncontested.length > 0 && (
              <>
                {pending.length > 0 ? `${uncontested.length} of them had ` : 'No manager met the bar for '}
                {pending.length > 0 ? 'no qualifying candidate this week.' : 'them this week.'}{' '}
              </>
            )}
            {pending.length > 0 && (
              <>
                {uncontested.length > 0 ? `The other ${pending.length} need ` : 'They need '}
                data the ingest does not collect yet.
              </>
            )}
          </p>
        </div>
      )}

      <PositionKings
        kings={isPreview ? [] : kings}
        teamName={(id) => byId.get(id)?.name ?? 'Team'}
      />

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

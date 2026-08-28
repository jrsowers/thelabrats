import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
  getPlayerSample, type StandingsTeam,
} from '@/lib/league/queries'
import { simulateSeason } from '@/lib/league/preview'
import { buildAwardCards } from '@/lib/awards/build'
import {
  NEED_LABEL, CADENCE_LABEL, awardsBySection, type AwardSection,
} from '@/lib/awards/catalog'
import type { AwardCard } from '@/lib/awards/placeholder'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { WeekSelect } from '@/components/ui/week-select'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { Eyebrow, TeamAvatar, Tag } from '@/components/ui/primitives'
import { AwardGrid } from '@/components/awards/award-grid'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Studs & Duds' }

const SECTION_ACCENT: Record<AwardSection, string> = {
  STUDS: 'var(--live)',
  DUDS: 'var(--loss)',
}

/** Header: always visible, even behind the frost. */
function CardHeader({ card }: { card: AwardCard }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h3 className="display text-[21px] leading-[1.05]">{card.def.name}</h3>
        <p className="mt-1 text-[12px] leading-snug text-muted">{card.def.blurb}</p>
      </div>
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
  )
}

/** Body: the answer. Blurred until the card is revealed. */
function CardBody({
  card, teams,
}: { card: AwardCard; teams: Map<number, StandingsTeam> }) {
  const accent = SECTION_ACCENT[card.def.section]
  const team = card.teamId != null ? teams.get(card.teamId) : null
  const opponent = card.opponentId != null ? teams.get(card.opponentId) : null

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

      {card.playerName && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-2.5 py-1.5">
          <PlayerHeadshot espnPlayerId={card.espnPlayerId} name={card.playerName} size={26} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-tight">
              {card.playerName}
            </div>
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-dim">
              {card.playerMeta}
            </div>
          </div>
        </div>
      )}

      {!card.playerName && opponent && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-2.5 py-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-dim">vs</span>
          <span className="truncate text-[13px] font-semibold">{opponent.name}</span>
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

      <AwardGrid
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

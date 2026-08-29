import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion, getLastSync,
  hasActiveGames,
} from '@/lib/league/queries'
import { SyncStatus } from '@/components/ui/sync-status'
import {
  computeStandings, computePlayoffStatus, latestCompletedWeek,
} from '@/lib/standings/compute'
import { buildBracket } from '@/lib/playoffs/bracket'
import { simulateSeason } from '@/lib/league/preview'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Bracket } from '@/components/playoffs/bracket'
import { Eyebrow, TeamAvatar, Tag, LockIcon } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Playoff Picture' }

export default async function PlayoffsPage({
  searchParams,
}: { searchParams: Promise<{ preview?: string; week?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'

  const champion = await getReigningChampion()
  const [teams, rawResults, lastSync, gamesActive] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getLastSync(),
    hasActiveGames(overview.currentWeek),
  ])

  const previewWeek = Math.min(
    Math.max(Number(params.week) || 10, 1),
    overview.regularSeasonWeeks,
  )
  const results = isPreview ? simulateSeason(rawResults, previewWeek) : rawResults

  const throughWeek = latestCompletedWeek(results)
  const metas = teams.map((t) => ({ seasonTeamId: t.seasonTeamId, name: t.name }))
  const rows = computeStandings(results, metas, throughWeek || 1)
  const status = computePlayoffStatus(
    rows, overview.regularSeasonWeeks, throughWeek, overview.playoffTeamCount,
  )

  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))
  const seeds = rows
    .slice(0, overview.playoffTeamCount)
    .map((r) => ({ seed: r.rank, seasonTeamId: r.seasonTeamId }))

  const rounds = buildBracket(seeds, overview.playoffTeamCount, overview.regularSeasonWeeks + 1)
  const hasPlayed = throughWeek > 0

  const inField = rows.slice(0, overview.playoffTeamCount)
  const outField = rows.slice(overview.playoffTeamCount)

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>Playoff Picture</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">
              Who&rsquo;s In? Who&rsquo;s Out?
            </h1>
          </div>
          <SyncStatus finishedAt={lastSync?.finished_at} autoRefresh={!isPreview && gamesActive} />
        </div>
      </header>

      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Preview</Tag>
          <p className="text-[13px] text-muted">
            A simulated season through week {previewWeek}. Nothing here is real.
          </p>
          <div className="ml-auto flex items-center gap-3">
            <nav className="flex items-center gap-1" aria-label="Preview week">
              {[6, 10, overview.regularSeasonWeeks].map((w) => (
                <Link
                  key={w}
                  href={`/playoffs?preview=live&week=${w}`}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] tnum ${
                    w === previewWeek ? 'bg-brand text-brand-ink' : 'text-muted hover:bg-surface-2'
                  }`}
                >
                  Wk {w}
                </Link>
              ))}
            </nav>
            <Link href="/playoffs" className="font-mono text-[10.5px] uppercase tracking-wider text-brand hover:underline">
              Exit →
            </Link>
          </div>
        </div>
      )}

      {!hasPlayed && (
        <div className="mb-6 rounded-lg border border-border bg-surface-2/60 px-4 py-3">
          <p className="text-[13px] text-muted">
            No games have been played, so these seeds are placeholders in league order.
            The bracket fills in from real standings once week 1 is final.
          </p>
        </div>
      )}

      {/* ---- Bracket ---- */}
      <section className="mb-9">
        <div className="mb-6 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Current Projection</h2>
        </div>
        <Bracket rounds={rounds} teams={byId} />
      </section>

      {/* ---- Bubble (§21.4) ---- */}
      <section>
        <div className="mb-6 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Outside Looking In</h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {outField.map((row) => {
              const team = byId.get(row.seasonTeamId)
              if (!team) return null
              const s = status.get(row.seasonTeamId)
              const isIn = row.rank <= overview.playoffTeamCount
              const isCut = row.rank === overview.playoffTeamCount

              return (
                <li
                  key={row.seasonTeamId}
                  className={`flex items-center gap-3 bg-surface px-4 py-2.5 ${
                    s === 'ELIMINATED' ? 'opacity-55' : ''
                  }`}
                >
                  <span className="display w-6 text-[16px] tnum">{row.rank}</span>
                  <TeamAvatar
                    photoUrl={team.photoUrl}
                    logoUrl={team.logoUrl}
                    abbrev={team.abbrev}
                    size={28}
                    champion={team.isChampion}
                    championYear={team.championYear}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="display truncate text-[15px]">{team.name}</span>
                      {s === 'ELIMINATED' && (
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-loss">
                          Out
                        </span>
                      )}
                    </div>
                    {row.tiebreakKind === 'HEAD_TO_HEAD' && (
                      <div className="truncate font-mono text-[9.5px] text-dim">
                        {row.tiebreakNote}
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-[12.5px] tnum">
                    {row.wins}-{row.losses}-{row.ties}
                  </span>
                  <span className="hidden w-20 text-right font-mono text-[12px] text-muted tnum sm:inline">
                    {row.pointsFor.toFixed(1)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </AppShell>
  )
}

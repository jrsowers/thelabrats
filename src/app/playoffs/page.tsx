import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion, getLastSync,
  hasActiveGames, getEspnStandings,
} from '@/lib/league/queries'
import { SyncStatus } from '@/components/ui/sync-status'
import {
  computeStandings, computePlayoffStatus, latestCompletedWeek, reconcileWithEspn,
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
  const [teams, rawResults, lastSync, gamesActive, espnStandings] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getLastSync(),
    hasActiveGames(overview.currentWeek),
    getEspnStandings(overview.seasonId),
  ])

  const previewWeek = Math.min(
    Math.max(Number(params.week) || 10, 1),
    overview.regularSeasonWeeks,
  )
  const results = isPreview ? simulateSeason(rawResults, previewWeek) : rawResults

  const throughWeek = latestCompletedWeek(results)
  const metas = teams.map((t) => ({ seasonTeamId: t.seasonTeamId, name: t.name }))
  const computed = computeStandings(results, metas, throughWeek || 1)

  // Under preview the season is invented, so ESPN's real seeds and odds must
  // not be laid over it.
  const espn = isPreview ? [] : espnStandings
  const { rows } = reconcileWithEspn(computed, espn, throughWeek)
  const espnById = new Map(espn.map((e) => [e.seasonTeamId, e]))

  const status = computePlayoffStatus(
    rows, overview.regularSeasonWeeks, throughWeek, overview.playoffTeamCount,
  )

  /** ESPN's call where it has made one; ours as the fallback. */
  const isEliminated = (seasonTeamId: number) => {
    const e = espnById.get(seasonTeamId)
    return e ? e.eliminated : status.get(seasonTeamId) === 'ELIMINATED'
  }

  // ESPN runs a Monte Carlo forecast we have no honest way to reproduce, so
  // the odds are mirrored rather than invented. Sorted longest-shot last.
  const forecast = rows
    .map((r) => ({ row: r, espn: espnById.get(r.seasonTeamId) }))
    .filter((x): x is { row: typeof x.row; espn: NonNullable<typeof x.espn> } =>
      x.espn != null && x.espn.playoffOdds != null)
    .sort((a, b) => (b.espn.playoffOdds ?? 0) - (a.espn.playoffOdds ?? 0))

  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))
  const seeds = rows
    .slice(0, overview.playoffTeamCount)
    .map((r) => ({ seed: r.rank, seasonTeamId: r.seasonTeamId }))

  const rounds = buildBracket(
    seeds,
    overview.playoffTeamCount,
    overview.regularSeasonWeeks + 1,
    overview.playoffRoundLengths,
  )
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

      {/* ---- ESPN's forecast ----
           Mirrored, not modelled. ESPN runs a Monte Carlo simulation over the
           remaining schedule; reproducing it would mean inventing a projection
           and calling it a fact. Everything else on this page is arithmetic on
           games that actually happened, so the source is labelled. */}
      {forecast.length > 0 && (
        <section className="mb-9">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-1.5">
            <h2 className="display text-2xl">The Odds</h2>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
              ESPN projection
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left sm:min-w-[560px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th scope="col" className="eyebrow px-3 py-2.5 sm:px-4">Team</th>
                    <th scope="col" className="eyebrow px-2 py-2.5 text-right">Playoff Odds</th>
                    <th scope="col" className="eyebrow px-2 py-2.5 text-right hidden sm:table-cell">
                      Proj. Finish
                    </th>
                    <th scope="col" className="eyebrow px-3 py-2.5 text-right sm:px-4 hidden sm:table-cell">
                      Proj. Record
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map(({ row, espn }) => {
                    const team = byId.get(row.seasonTeamId)
                    if (!team) return null
                    const pct = Math.round((espn.playoffOdds ?? 0) * 100)
                    return (
                      <tr key={row.seasonTeamId} className="border-b border-border bg-surface last:border-0">
                        <td className="px-3 py-2.5 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <TeamAvatar
                              photoUrl={team.photoUrl}
                              logoUrl={team.logoUrl}
                              abbrev={team.abbrev}
                              size={26}
                              champion={team.isChampion}
                              championYear={team.championYear}
                            />
                            <span className="display truncate text-[15px]">{team.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          {/* The bar is decoration; the number is the fact. */}
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-surface-2 sm:block"
                              aria-hidden
                            >
                              <span
                                className="block h-full rounded-full bg-brand"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="w-10 text-right font-mono text-[13px] font-semibold tnum">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-2 py-2.5 text-right font-mono text-[13px] text-muted tnum sm:table-cell">
                          {espn.projectedRank ?? '\u2014'}
                        </td>
                        <td className="hidden px-3 py-2.5 text-right font-mono text-[13px] text-muted tnum sm:px-4 sm:table-cell">
                          {espn.projectedWins != null && espn.projectedLosses != null
                            ? `${espn.projectedWins}-${espn.projectedLosses}`
                            : '\u2014'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

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
              const out = isEliminated(row.seasonTeamId)

              return (
                <li
                  key={row.seasonTeamId}
                  className={`flex items-center gap-3 bg-surface px-4 py-2.5 ${
                    out ? 'opacity-55' : ''
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
                      {out && (
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

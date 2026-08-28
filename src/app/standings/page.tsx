import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion, getLastSync,
} from '@/lib/league/queries'
import {
  computeStandings, computeMovement, latestCompletedWeek, computePlayoffStatus,
} from '@/lib/standings/compute'
import { simulateSeason } from '@/lib/league/preview'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, TeamAvatar, Tag, EmptyState, LockIcon } from '@/components/ui/primitives'
import { fmtStandingsUpdate } from '@/lib/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'League Standings' }

/** Green up, red down. Never colour alone — the arrow and number carry it too. */
function Movement({ delta }: { delta: number }) {
  if (!delta) {
    return <span className="w-9 text-center font-mono text-[11px] text-dim" aria-hidden>—</span>
  }
  const up = delta > 0
  return (
    <span
      className={`flex w-9 items-center justify-center gap-0.5 font-mono text-[11px] font-semibold tnum ${
        up ? 'text-live' : 'text-loss'
      }`}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'place' : 'places'} since last week`}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {Math.abs(delta)}
    </span>
  )
}

export default async function StandingsPage({
  searchParams,
}: { searchParams: Promise<{ preview?: string; week?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'

  const champion = await getReigningChampion()
  const [teams, rawResults, lastSync] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getLastSync(),
  ])

  // Preview simulates the season to a given week so every state can be seen:
  // week 8 for mid-season jockeying, week 12+ for clinches and eliminations.
  // Never written — decorated on the way to the view (§16).
  const previewWeek = Math.min(
    Math.max(Number(params.week) || 8, 1),
    overview.regularSeasonWeeks,
  )
  const results = isPreview ? simulateSeason(rawResults, previewWeek) : rawResults

  const throughWeek = latestCompletedWeek(results)
  const metas = teams.map((t) => ({ seasonTeamId: t.seasonTeamId, name: t.name }))
  const rows = computeStandings(results, metas, throughWeek || 1)
  const movement = computeMovement(results, metas, throughWeek)
  const playoffStatus = computePlayoffStatus(
    rows, overview.regularSeasonWeeks, throughWeek, overview.playoffTeamCount,
  )
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const hasPlayed = throughWeek > 0
  const playoffLine = overview.playoffTeamCount

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>League Standings{hasPlayed ? ` · Through Week ${throughWeek}` : ''}</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Power Ranking</h1>
          </div>
        </div>
      </header>

      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Preview</Tag>
          <p className="text-[13px] text-muted">
            A simulated season through week {previewWeek}, so you can see the table
            populated. Nothing here is real and nothing was saved.
          </p>
          <div className="ml-auto flex items-center gap-3">
            <nav className="flex items-center gap-1" aria-label="Preview week">
              {[4, 8, 12, overview.regularSeasonWeeks].map((w) => (
                <Link
                  key={w}
                  href={`/standings?preview=live&week=${w}`}
                  className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] tnum ${
                    w === previewWeek ? 'bg-brand text-brand-ink' : 'text-muted hover:bg-surface-2'
                  }`}
                >
                  Wk {w}
                </Link>
              ))}
            </nav>
            <Link
              href="/standings"
              className="font-mono text-[10.5px] uppercase tracking-wider text-brand hover:underline"
            >
              Exit →
            </Link>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th scope="col" className="eyebrow px-3 py-2.5 sm:px-4">Rank</th>
                <th scope="col" className="eyebrow px-2 py-2.5">Team</th>
                <th scope="col" className="eyebrow px-2 py-2.5 text-right">W-L-T</th>
                <th scope="col" className="eyebrow px-2 py-2.5 text-right">PF</th>
                <th scope="col" className="eyebrow px-2 py-2.5 text-right">PA</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right sm:px-4">Streak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const team = byId.get(row.seasonTeamId)
                if (!team) return null
                const delta = movement.get(row.seasonTeamId) ?? 0
                const status = playoffStatus.get(row.seasonTeamId)
                const inPlayoffs = row.rank <= playoffLine
                const isCutoff = row.rank === playoffLine
                const eliminated = status === 'ELIMINATED'

                return (
                  <tr
                    key={row.seasonTeamId}
                    className={`state-bar border-b border-border bg-surface last:border-0 ${
                      isCutoff ? '!border-b-2 !border-b-brand/55' : ''
                    } ${eliminated ? 'opacity-55' : ''}`}
                    style={{ '--state': inPlayoffs ? 'var(--brand)' : 'transparent' } as React.CSSProperties}
                  >
                    <td className="px-3 py-2.5 sm:px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="display w-5 text-[17px] tnum">{row.rank}</span>
                        <Movement delta={delta} />
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <TeamAvatar
                          photoUrl={team.photoUrl}
                          logoUrl={team.logoUrl}
                          abbrev={team.abbrev}
                          size={30}
                          champion={team.isChampion}
                          championYear={team.championYear}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="display truncate text-[15.5px] leading-tight">
                              {team.name}
                            </span>
                            {status === 'CLINCHED' && (
                              <span
                                className="shrink-0 text-brand"
                                title="Clinched playoff berth"
                                aria-label="Clinched playoff berth"
                                role="img"
                              >
                                <LockIcon />
                              </span>
                            )}
                            {eliminated && (
                              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-loss">
                                Out
                              </span>
                            )}
                          </div>
                          {team.manager && (
                            <div className="truncate text-[11px] text-muted">{team.manager}</div>
                          )}
                          {row.tiebreakKind === 'HEAD_TO_HEAD' && (
                            <div className="truncate font-mono text-[9.5px] text-dim">
                              {row.tiebreakNote}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[13px] tnum">
                      {row.wins}-{row.losses}-{row.ties}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[13px] tnum">
                      {row.pointsFor.toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[13px] text-muted tnum">
                      {row.pointsAgainst.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right sm:px-4">
                      {row.streak ? (
                        <span
                          className={`font-mono text-[13px] font-semibold tnum ${
                            row.streak.type === 'W' ? 'text-live'
                            : row.streak.type === 'L' ? 'text-loss' : 'text-muted'
                          }`}
                        >
                          {row.streak.type}-{row.streak.count}
                        </span>
                      ) : (
                        <span className="font-mono text-[13px] text-dim">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!hasPlayed && (
          <div className="border-t border-border bg-surface">
            <EmptyState
              title="No games played yet."
              hint="Records, streaks and movement fill in once week 1 is final."
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="font-mono text-[10.5px] text-dim">
          <span className="font-bold text-muted">Last standings update:</span>{' '}
          {fmtStandingsUpdate(lastSync?.finished_at ?? null) ?? 'never'}
        </p>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10.5px] text-dim">
          <div className="flex items-center gap-1.5">
            <dt className="inline-block h-[2px] w-5 rounded-full bg-brand" aria-hidden />
            <dd>Projected Playoff Cut</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-brand" aria-hidden><LockIcon size={12} /></dt>
            <dd>Clinched Playoff Berth</dd>
          </div>
        </dl>
      </div>
    </AppShell>
  )
}

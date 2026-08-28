import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion,
  getSeasonHistory,
} from '@/lib/league/queries'
import { computeRecords, computeCareers } from '@/lib/records/compute'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import {
  Eyebrow, TeamAvatar, Trophy, MysteryAvatar, EmptyState,
} from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Record Books' }

const f2 = (n: number) => n.toFixed(2)

export default async function RecordsPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const champion = await getReigningChampion()
  const [teams, results, history] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getSeasonHistory(),
  ])
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const withYear = results.map((m) => ({ ...m, year: overview.season }))
  const records = computeRecords(withYear)
  const careers = computeCareers(withYear).filter((c) => c.games > 0)

  const completed = history.filter((h) => h.champion)

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-8 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <Eyebrow>Record Books</Eyebrow>
          <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Permanent Record</h1>
        </div>
      </header>

      {/* ================= CHAMPIONS CORNER ================= */}
      <section className="mb-11">
        <div className="mb-6 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Champions Corner</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* This season, undecided. */}
          <article
            className="state-bar flex flex-col justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-5 py-6"
            style={{ '--state': 'var(--border-strong)' } as React.CSSProperties}
          >
            <Eyebrow>{overview.season} Season</Eyebrow>
            <div className="mt-3 flex items-center gap-4">
              <MysteryAvatar size={56} />
              <div>
                <div className="display text-[30px] leading-none text-muted">
                  Who could it be?
                </div>
                <p className="mt-1.5 text-[13px] text-dim">
                  Thirteen weeks, six playoff spots, one trophy. Nobody has scored a
                  point yet.
                </p>
              </div>
            </div>
          </article>

          {/* Completed seasons. */}
          {completed.map((season) => {
            const c = season.champion!
            const runners = season.podium.filter((p) => p.place > 1)
            return (
              <article
                key={season.year}
                className="state-bar overflow-hidden rounded-lg border border-border bg-surface"
                style={{ '--state': 'var(--gold)' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                  <Eyebrow>{season.year} Season</Eyebrow>
                  {season.platform && (
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-dim">
                      Played on {season.platform}
                    </span>
                  )}
                </div>

                <div className="px-5 py-4">
                  <div className="flex items-center gap-3.5">
                    <TeamAvatar photoUrl={c.photoUrl} size={52} champion championYear={season.year} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Trophy place={1} size={15} />
                        <span className="display truncate text-[24px] leading-none">
                          {c.teamName}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] text-muted">
                        {c.managerName}
                        {c.record && <span className="font-mono tnum"> · {c.record}</span>}
                      </div>
                    </div>
                  </div>

                  {c.titleGame && (
                    <div className="mt-4 rounded-md border border-border bg-surface-2/60 px-3.5 py-2.5">
                      <Eyebrow>Championship</Eyebrow>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                        <span className="display text-[19px] tnum">
                          {f2(c.titleGame.scoreFor)}
                        </span>
                        <span className="font-mono text-[11px] text-dim">def.</span>
                        <span className="display text-[19px] tnum text-muted">
                          {f2(c.titleGame.scoreAgainst)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-muted">
                        over {c.titleGame.opponent}
                      </div>
                    </div>
                  )}

                  {runners.length > 0 && (
                    <ul className="mt-3.5 space-y-1.5 border-t border-border pt-3">
                      {runners.map((p) => (
                        <li key={p.place} className="flex items-center gap-2">
                          <Trophy place={p.place} size={12} />
                          <span className="font-mono text-[10px] text-dim tnum">
                            {p.place === 2 ? '2nd' : '3rd'}
                          </span>
                          <span className="truncate text-[12.5px] font-medium">{p.teamName}</span>
                          <span className="truncate text-[11.5px] text-muted">
                            {p.managerName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* ================= FIRSTS AND WORSTS ================= */}
      <section>
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Firsts and Worsts</h2>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
            {overview.season} onward
          </span>
        </div>

        {records.length === 0 ? (
          <>
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                title="No records yet."
                hint="Every one of these is set in week 1 and broken from there."
              />
            </div>
            <p className="mt-4 max-w-2xl text-[13px] text-muted">
              The 2025 season was played on Yahoo, so there is no game-level history to
              import — only the final standings above. These records begin accumulating
              with the first {overview.season} kickoff.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {records.map((r) => {
                const team = r.teamId != null ? byId.get(r.teamId) : null
                const pair = r.teamIds.map((id) => byId.get(id)).filter(Boolean)
                return (
                  <div
                    key={r.key}
                    className="state-bar rounded-lg border border-border bg-surface px-4 py-3.5"
                    style={{
                      '--state': r.polarity === 'high' ? 'var(--live)' : 'var(--loss)',
                    } as React.CSSProperties}
                  >
                    <Eyebrow>{r.label}</Eyebrow>
                    <div
                      className="display mt-1 text-[32px] tnum"
                      style={{ color: r.polarity === 'high' ? 'var(--live)' : 'var(--loss)' }}
                    >
                      {f2(r.value)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {team ? (
                        <>
                          <TeamAvatar
                            photoUrl={team.photoUrl} logoUrl={team.logoUrl} abbrev={team.abbrev}
                            size={22} champion={team.isChampion} championYear={team.championYear}
                          />
                          <span className="truncate text-[13px] font-medium">{team.name}</span>
                        </>
                      ) : (
                        <span className="truncate text-[13px] font-medium">
                          {pair.map((t) => t!.name).join(' vs ')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[10.5px] text-dim tnum">
                      Week {r.week}, {r.year} · {r.context}
                    </div>
                  </div>
                )
              })}
            </div>

            {careers.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 border-b border-border pb-1.5">
                  <h3 className="display text-xl">All-Time Ledger</h3>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-border bg-surface-2">
                          <th scope="col" className="eyebrow px-4 py-2.5">Team</th>
                          <th scope="col" className="eyebrow px-2 py-2.5 text-right">Record</th>
                          <th scope="col" className="eyebrow px-2 py-2.5 text-right">Win %</th>
                          <th scope="col" className="eyebrow px-4 py-2.5 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {careers.map((c) => {
                          const t = byId.get(c.teamId)
                          return (
                            <tr key={c.teamId} className="border-b border-border bg-surface last:border-0">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2.5">
                                  {t && (
                                    <TeamAvatar
                                      photoUrl={t.photoUrl} logoUrl={t.logoUrl} abbrev={t.abbrev}
                                      size={24} champion={t.isChampion} championYear={t.championYear}
                                    />
                                  )}
                                  <span className="display truncate text-[14.5px]">{t?.name ?? '—'}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-[12.5px] tnum">
                                {c.wins}-{c.losses}-{c.ties}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-[12.5px] tnum text-muted">
                                {(c.winPct * 100).toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-[12.5px] tnum">
                                {f2(c.pointsFor)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  )
}

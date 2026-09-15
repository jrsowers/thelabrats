import type { Metadata } from 'next'
import {
  getLeagueOverview, getSeasonTeams, getReigningChampion, getSeasonHistory,
} from '@/lib/league/queries'
import { getAllTimeRecordInputs } from '@/lib/records/queries'
import {
  computeRecords, computeCareers, recordsInGroup, positionRecords, fmtRecord,
  type LeagueRecord, type RecordGroup,
} from '@/lib/records/compute'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import {
  Eyebrow, TeamAvatar, Trophy, MysteryAvatar, EmptyState,
} from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Record Books' }

const f2 = (n: number) => n.toFixed(2)

/**
 * Three sections, per James. The alternative was one grid of thirty cards,
 * which is a wall rather than a record book.
 *
 * The split is by WHO OR WHAT IS RESPONSIBLE, which is the question a reader is
 * actually asking: did the team play well, did the manager decide well, or did
 * one player have a day? A team record measured over a season and one measured
 * over a week belong together — hence the scope chip on each card rather than a
 * fourth section.
 */
const GROUPS: { key: RecordGroup; title: string; blurb: string }[] = [
  { key: 'team', title: 'Team Records', blurb: 'Scores, margins, streaks' },
  { key: 'manager', title: 'Manager Records', blurb: 'Decisions, not scores' },
  { key: 'player', title: 'Player Records', blurb: 'Individual performances' },
]

type TeamLookup = Map<number, Awaited<ReturnType<typeof getSeasonTeams>>[number]>

/**
 * One record.
 *
 * Colour is driven by `tone` (good/bad), never by whether the number is large.
 * They come apart constantly — the largest margin of defeat is a big number and
 * a bad day, the lowest winning score is a small number and still a win.
 */
function RecordCard({ record, teamOf }: { record: LeagueRecord; teamOf: TeamLookup }) {
  const colour = record.tone === 'good' ? 'var(--live)' : 'var(--loss)'
  const [lead, ...rest] = record.holders

  return (
    <div
      className="state-bar rounded-lg border border-border bg-surface px-4 py-3.5"
      style={{ '--state': colour } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>{record.label}</Eyebrow>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-dim">
          {record.scope === 'season' ? 'Season' : 'Week'}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="display text-[32px] leading-none tnum" style={{ color: colour }}>
          {fmtRecord(record.value, record.format, record.signed)}
        </span>
        {record.valueSuffix && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
            {record.valueSuffix}
          </span>
        )}
      </div>

      {/* Every holder is listed. In an inaugural season the all-time record and
          the season record are the same thing, so ties are common and hiding
          them would credit one of several teams with something they share. */}
      <ul className="mt-2 space-y-1.5">
        {record.holders.map((h, i) => {
          const t = teamOf.get(h.teamId)
          return (
            <li key={`${h.teamId}-${h.year}-${h.week ?? 'season'}-${i}`}>
              {/* A player record leads with the player's face — the manager is
                  the supporting detail there, which is the reverse of a team
                  record. */}
              {h.player ? (
                <div className="flex items-center gap-2">
                  <PlayerHeadshot
                    espnPlayerId={h.player.espnPlayerId}
                    name={h.player.name}
                    size={26}
                    teamAbbrev={h.player.nflTeam}
                    isTeamDefense={h.player.position === 'D/ST'}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{h.player.name}</div>
                    <div className="flex items-center gap-1.5">
                      {t && (
                        <TeamAvatar
                          photoUrl={t.photoUrl} logoUrl={t.logoUrl} abbrev={t.abbrev}
                          size={14} champion={t.isChampion} championYear={t.championYear}
                        />
                      )}
                      <span className="truncate text-[11.5px] text-muted">{t?.name ?? '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {t && (
                    <TeamAvatar
                      photoUrl={t.photoUrl} logoUrl={t.logoUrl} abbrev={t.abbrev}
                      size={22} champion={t.isChampion} championYear={t.championYear}
                    />
                  )}
                  <span className="truncate text-[13px] font-medium">{t?.name ?? '—'}</span>
                </div>
              )}
              <div className={`mt-0.5 font-mono text-[10.5px] text-dim tnum ${h.player ? 'pl-[34px]' : 'pl-[30px]'}`}>
                {h.week == null ? `${h.year} season` : `Week ${h.week}, ${h.year}`}
                {h.context && ` · ${h.context}`}
              </div>
            </li>
          )
        })}
      </ul>

      {rest.length > 0 && (
        <div className="mt-2 font-mono text-[9.5px] uppercase tracking-wider text-dim">
          {lead && `Shared by ${record.holders.length}`}
        </div>
      )}
    </div>
  )
}

export default async function RecordsPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const champion = await getReigningChampion()
  const [teams, history, inputs] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonHistory(),
    getAllTimeRecordInputs(),
  ])
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const records = computeRecords(inputs)
  const kings = positionRecords(records)
  const careers = computeCareers(inputs.matchups).filter((c) => c.games > 0)

  const completed = history.filter((h) => h.champion)

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-8 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <Eyebrow>Record Books</Eyebrow>
          <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">There&rsquo;s No Denying It&hellip;</h1>
        </div>
      </header>

      {/* ================= CHAMPIONS CORNER ================= */}
      <section className="mb-11">
        <div className="mb-6 border-b border-border pb-1.5">
          <h2 className="display text-2xl">Champions Corner</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
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
                <div className="border-b border-border px-5 py-2.5">
                  <Eyebrow>{season.year} Season</Eyebrow>
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
                        <span className="font-mono text-[11px] text-dim">vs.</span>
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
                  12 teams. 6 playoff spots. 1 championship trophy.
                </p>
              </div>
            </div>
          </article>

        </div>
      </section>

      {/* ================= ALL-TIME LEDGER ================= */}
      {/* Directly under Champions Corner: the trophies say who won, this says
          who has actually been good. Its own section rather than a footnote to
          the records grid, which is where it used to live — and which meant a
          league with no records yet also showed no ledger. */}
      {careers.length > 0 && (
        <section className="mb-11">
          <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
            <h2 className="display text-2xl">All-Time Ledger</h2>
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
              Every game ever played
            </span>
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
        </section>
      )}

      {/* ================= ALL-TIME RECORDS ================= */}
      {records.length === 0 ? (
        <section>
          <div className="mb-6 border-b border-border pb-1.5">
            <h2 className="display text-2xl">All-Time Records</h2>
          </div>
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
        </section>
      ) : (
        <>
          {/* ============ BEST BY POSITION ============ */}
          {/* Top of the record book, per James. It is the most scannable thing
              on the page — one row per position, six different names — so it
              earns the first screen where a wall of cards would not. */}
          {kings.length > 0 && (
            <section className="mb-11">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-1.5">
                <h2 className="display text-2xl">Best Performances Ever, By Position</h2>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
                  Started players only
                </span>
              </div>
              <ul className="grid min-w-0 gap-2 sm:grid-cols-2">
                {kings.map((r) => {
                  const h = r.holders[0]
                  const t = byId.get(h.teamId)
                  return (
                    <li
                      key={r.key}
                      className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5"
                    >
                      <span className="w-8 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-dim">
                        {r.label.replace('Best ', '')}
                      </span>
                      {h.player && (
                        <PlayerHeadshot
                          espnPlayerId={h.player.espnPlayerId}
                          name={h.player.name}
                          size={28}
                          teamAbbrev={h.player.nflTeam}
                          isTeamDefense={h.player.position === 'D/ST'}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="display truncate text-[15px] leading-tight">
                          {h.player?.name ?? '—'}
                        </div>
                        <div className="truncate font-mono text-[10px] uppercase tracking-wider text-dim">
                          {t?.name ?? '—'} · W{h.week} {h.year}
                        </div>
                      </div>
                      <div
                        className="display shrink-0 text-[17px] leading-none tnum"
                        style={{ color: 'var(--live)' }}
                      >
                        {fmtRecord(r.value, r.format)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {GROUPS.map((g) => {
            const inGroup = recordsInGroup(records, g.key)
            if (inGroup.length === 0) return null
            return (
              <section key={g.key} className="mb-11">
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-1.5">
                  <h2 className="display text-2xl">{g.title}</h2>
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
                    {g.blurb}
                  </span>
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {inGroup.map((r) => (
                    <RecordCard key={r.key} record={r} teamOf={byId} />
                  ))}
                </div>

              </section>
            )
          })}
        </>
      )}
    </AppShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getSeasonResults, getReigningChampion, getLastSync,
  hasActiveGames, getEspnStandings, getSeedHistory,
} from '@/lib/league/queries'
import {
  computeStandings, computeMovement, rankMovementFor,
  latestCompletedWeek, computePlayoffStatus,
  reconcileWithEspn,
} from '@/lib/standings/compute'
import { simulateSeason } from '@/lib/league/preview'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, Tag, EmptyState, LockIcon } from '@/components/ui/primitives'
import { SyncStatus } from '@/components/ui/sync-status'
import {
  StandingsTable, type StandingsTableRow,
} from '@/components/standings/standings-table'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'League Standings' }

export default async function StandingsPage({
  searchParams,
}: { searchParams: Promise<{ preview?: string; week?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'

  const champion = await getReigningChampion()
  const [
    teams, rawResults, lastSync, gamesActive, espnStandings, seedHistory,
  ] = await Promise.all([
    getSeasonTeams(overview.seasonId, champion),
    getSeasonResults(overview.seasonId),
    getLastSync(),
    hasActiveGames(overview.currentWeek),
    getEspnStandings(overview.seasonId),
    getSeedHistory(overview.seasonId),
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
  const computed = computeStandings(results, metas, throughWeek || 1)

  // ESPN owns the tiebreaker rulebook, so its seeds decide the order once they
  // mean anything. Under preview the table is invented, so ESPN's real seeds
  // must not be applied to it.
  const espn = isPreview ? [] : espnStandings
  const { rows, usedEspnSeeds, recordMismatches } = reconcileWithEspn(computed, espn, throughWeek)
  const espnById = new Map(espn.map((e) => [e.seasonTeamId, e]))

  // ⚠️ THE ARROWS MUST COME FROM THE TABLE BEING DISPLAYED. Previously this
  // diffed our own engine while the rows above showed ESPN's seeds, which put
  // Doug at rank 6 with a "down 6" arrow after week 2 — a delta measured
  // against a table nobody could see. Six of twelve arrows were wrong.
  //
  // Preview invents a season, so there are no real seeds to diff and the
  // computed movement is the only honest answer there.
  // ⚠️ THE ARROWS MUST COME FROM THE TABLE BEING DISPLAYED. This used to diff
  // our own engine while the rows above showed ESPN's seeds, which rendered
  // Doug at rank 6 with a "down 6" arrow after week 2 — a delta measured
  // against a table nobody could see. Six of twelve arrows were wrong.
  //
  // rankMovementFor returns null when the two weeks would be ranked by
  // different rulebooks, and no arrow is the correct output there. ESPN seeds
  // have only been captured since 2026-09-22, so week 2 has no comparable
  // predecessor and shows none.
  //
  // Preview invents a season, so no real seed exists or should; its own
  // computed movement is the only honest answer.
  const movement = isPreview
    ? computeMovement(results, metas, throughWeek)
    : rankMovementFor(results, metas, throughWeek, seedHistory)?.movement
      ?? new Map<number, number>()
  const playoffStatus = computePlayoffStatus(
    rows, overview.regularSeasonWeeks, throughWeek, overview.playoffTeamCount,
  )
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const hasPlayed = throughWeek > 0
  const playoffLine = overview.playoffTeamCount

  // One flat object per team, in seed order, carrying every cell that team
  // renders. The table sorts this array and reads nothing else, so a row
  // cannot come apart no matter how it is reordered. Seed order is also the
  // tiebreak the table falls back to, and the order it returns to on reload.
  const tableRows: StandingsTableRow[] = rows.flatMap((row) => {
    const team = byId.get(row.seasonTeamId)
    if (!team) return []
    const e = espnById.get(row.seasonTeamId)
    return [{
      seasonTeamId: row.seasonTeamId,
      rank: row.rank,
      movement: movement.get(row.seasonTeamId) ?? 0,
      name: team.name,
      manager: team.manager ?? null,
      abbrev: team.abbrev ?? null,
      photoUrl: team.photoUrl ?? null,
      logoUrl: team.logoUrl ?? null,
      isChampion: Boolean(team.isChampion),
      championYear: team.championYear ?? null,
      // Points-for tiebreaks are suppressed: PF is already its own column, so
      // only a head-to-head note adds anything that is not on screen.
      tiebreakNote: row.tiebreakKind === 'HEAD_TO_HEAD' ? row.tiebreakNote : null,
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      winPct: row.winPct,
      pointsFor: row.pointsFor,
      pointsAgainst: row.pointsAgainst,
      streak: row.streak,
      moves: e?.acquisitions ?? 0,
      playoffOdds: e?.playoffOdds ?? null,
      // ESPN's call beats ours where ESPN has made one. 'UNKNOWN' is ESPN
      // saying it has not decided — not "not clinched".
      clinched: e?.playoffClinch
        ? e.playoffClinch.startsWith('CLINCHED')
        : playoffStatus.get(row.seasonTeamId) === 'CLINCHED',
      eliminated: e
        ? e.eliminated
        : playoffStatus.get(row.seasonTeamId) === 'ELIMINATED',
      inPlayoffs: row.rank <= playoffLine,
    }]
  })

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>League Standings{hasPlayed ? ` · Through Week ${throughWeek}` : ''}</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Power Ranking</h1>
          </div>
          <SyncStatus finishedAt={lastSync?.finished_at} autoRefresh={!isPreview && gamesActive} />
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

      {/* A disagreement means one of us has the record wrong. Saying so beats
          silently picking a side (CLAUDE.md: data correctness first). */}
      {recordMismatches.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Check</Tag>
          <p className="text-[13px] text-muted">
            Our record and ESPN&rsquo;s disagree for{' '}
            {recordMismatches
              .map((id) => byId.get(id)?.name ?? 'a team')
              .join(', ')}
            . ESPN is the system of record — the seeding below follows it.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <StandingsTable rows={tableRows} playoffLine={playoffLine} />

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
          {usedEspnSeeds
            ? 'Seeded by ESPN. Records computed from final scores.'
            : 'Seeded by record, then head-to-head, then points for.'}
        </p>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10.5px] text-dim">
          <div className="flex items-center gap-1.5">
            <dt className="text-brand" aria-hidden><LockIcon size={12} /></dt>
            <dd>Clinched Playoff Berth</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wider">Playoff %</dt>
            <dd>ESPN's simulation</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wider">Moves</dt>
            <dd>ESPN's own counter: pickups and claims</dd>
          </div>
        </dl>
      </div>
    </AppShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getLeagueOverview, getSeasonTeams, getReigningChampion, getLastSync, hasActiveGames,
  getTransactionLog,
  type StandingsTeam,
} from '@/lib/league/queries'
import { simulateTransactions, type PreviewTxn } from '@/lib/league/preview'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, TeamAvatar, Tag, EmptyState } from '@/components/ui/primitives'
import { SyncStatus } from '@/components/ui/sync-status'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Transaction Log' }

const TZ = 'America/New_York'

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'added',   label: 'Players Added' },
  { key: 'dropped', label: 'Players Dropped' },
  { key: 'trades',  label: 'Trades' },
  { key: 'waivers', label: 'Waiver Claims' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

/** A transaction matches a filter if any of its items do — an add/drop pair
 *  shows under both Added and Dropped, which is what a manager expects. */
function matches(txn: PreviewTxn, filter: FilterKey): boolean {
  switch (filter) {
    case 'all': return true
    case 'trades': return txn.kind === 'TRADE'
    case 'waivers': return txn.kind === 'WAIVER'
    case 'added': return txn.items.some((i) => i.action === 'ADD')
    case 'dropped': return txn.items.some((i) => i.action === 'DROP')
  }
}

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso))

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ,
  }).format(new Date(iso)).toUpperCase()

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: TZ,
  }).format(new Date(iso))

const KIND_LABEL: Record<PreviewTxn['kind'], string> = {
  WAIVER: 'Waiver Claim',
  FREE_AGENT: 'Free Agent',
  DROP: 'Drop',
  TRADE: 'Trade',
}

function PlayerLine({
  name, position, nflTeam, action,
}: { name: string; position: string; nflTeam: string; action: 'ADD' | 'DROP' | 'TRADE' }) {
  const tone =
    action === 'ADD' ? 'text-live' : action === 'DROP' ? 'text-loss' : 'text-brand'
  const verb = action === 'ADD' ? 'Added' : action === 'DROP' ? 'Dropped' : 'Traded'
  return (
    <div className="flex items-baseline gap-2">
      <span className={`w-[52px] shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wider ${tone}`}>
        {verb}
      </span>
      <span className="display text-[14.5px]">{name}</span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
        {position} · {nflTeam}
      </span>
    </div>
  )
}

function TradeBody({ txn, teams }: { txn: PreviewTxn; teams: Map<number, StandingsTeam> }) {
  // Spec §23.4: one combined transaction, both sides visible — never a separate
  // confusing row per player movement.
  const sides = [txn.teamId, txn.counterpartyTeamId].filter((x): x is number => x != null)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sides.map((teamId) => {
        const team = teams.get(teamId)
        const received = txn.items.filter((i) => i.toTeamId === teamId)
        return (
          <div key={teamId} className="rounded-md border border-border bg-surface-2/50 px-3 py-2">
            <Eyebrow className="mb-1.5">{team?.name ?? 'Team'} receives</Eyebrow>
            <ul className="space-y-1">
              {received.map((i, idx) => (
                <li key={idx} className="flex items-baseline gap-2">
                  <span className="display text-[14px]">{i.playerName}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                    {i.position} · {i.nflTeam}
                  </span>
                </li>
              ))}
              {received.length === 0 && <li className="text-[12px] text-dim">—</li>}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default async function TransactionsPage({
  searchParams,
}: { searchParams: Promise<{ preview?: string; filter?: string; week?: string }> }) {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const params = await searchParams
  const isPreview = params.preview === 'live'
  const filter = (FILTERS.find((f) => f.key === params.filter)?.key ?? 'all') as FilterKey

  const champion = await getReigningChampion()
  const teams = await getSeasonTeams(overview.seasonId, champion)
  const [lastSync, gamesActive] = await Promise.all([
    getLastSync(),
    hasActiveGames(overview.currentWeek),
  ])
  const byId = new Map(teams.map((t) => [t.seasonTeamId, t]))

  const previewWeek = Math.min(Math.max(Number(params.week) || 6, 1), overview.regularSeasonWeeks)

  // Real moves when there are any; the simulator only under ?preview=live.
  // The page renders both through the same code because getTransactionLog
  // returns the shape the preview generator produces.
  const all: PreviewTxn[] = isPreview
    ? simulateTransactions(teams.map((t) => t.seasonTeamId), previewWeek)
    : (await getTransactionLog(overview.seasonId)) as unknown as PreviewTxn[]

  const visible = all.filter((t) => matches(t, filter))

  // Group by calendar day, newest first (§23.3).
  const groups = new Map<string, PreviewTxn[]>()
  for (const txn of visible) {
    const key = dayKey(txn.processedAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(txn)
  }

  const qs = (next: Partial<{ filter: string; week: number }>) => {
    const p = new URLSearchParams()
    if (isPreview) p.set('preview', 'live')
    const f = next.filter ?? filter
    if (f !== 'all') p.set('filter', f)
    const w = next.week ?? previewWeek
    if (isPreview && w !== 6) p.set('week', String(w))
    const s = p.toString()
    return s ? `/transactions?${s}` : '/transactions'
  }

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-7 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <Eyebrow>Transaction Log</Eyebrow>
            <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">Who&rsquo;s Makin&rsquo; Moves?</h1>
          </div>
          <SyncStatus finishedAt={lastSync?.finished_at} autoRefresh={!isPreview && gamesActive} />
        </div>
      </header>

      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3">
          <Tag tone="warn">Preview</Tag>
          <p className="text-[13px] text-muted">
            Simulated moves through week {previewWeek}, so the log and its filters can
            be seen working. Nothing here is real.
          </p>
          <Link href={qs({})} className="ml-auto font-mono text-[10.5px] uppercase tracking-wider text-brand hover:underline">
            Exit →
          </Link>
        </div>
      )}

      {/* ---- Filters ---- */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 border-b border-border" aria-label="Filter transactions">
        {FILTERS.map((f) => {
          const active = f.key === filter
          const count = all.filter((t) => matches(t, f.key)).length
          return (
            <Link
              key={f.key}
              href={qs({ filter: f.key })}
              aria-current={active ? 'page' : undefined}
              className={`tap-target -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-brand text-text'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {f.label}
              <span className="font-mono text-[10px] text-dim tnum">{count}</span>
            </Link>
          )
        })}
      </nav>

      {/* ---- Ledger ---- */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            title={
              isPreview
                ? 'No moves match this filter.'
                : 'No transactions have been recorded yet.'
            }
            hint={
              isPreview
                ? undefined
                : 'Adds, drops, waiver claims and trades appear here once the season opens.'
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([key, txns]) => (
            <section key={key}>
              <h2 className="eyebrow mb-2 border-b border-border pb-1.5">
                {dayLabel(txns[0].processedAt)}
              </h2>
              <ul className="space-y-2">
                {txns.map((txn) => {
                  const team = byId.get(txn.teamId)
                  const isTrade = txn.kind === 'TRADE'
                  return (
                    <li
                      key={txn.id}
                      className="state-bar rounded-lg border border-border bg-surface px-4 py-3"
                      style={{
                        '--state':
                          txn.kind === 'TRADE' ? 'var(--brand)'
                          : txn.kind === 'DROP' ? 'var(--loss)'
                          : 'var(--live)',
                      } as React.CSSProperties}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        {team && (
                          <TeamAvatar
                            photoUrl={team.photoUrl}
                            logoUrl={team.logoUrl}
                            abbrev={team.abbrev}
                            size={26}
                            champion={team.isChampion}
                            championYear={team.championYear}
                          />
                        )}
                        <span className="display text-[15px]">{team?.name ?? 'Team'}</span>
                        <Tag tone={isTrade ? 'brand' : txn.kind === 'DROP' ? 'loss' : 'neutral'}>
                          {KIND_LABEL[txn.kind]}
                        </Tag>
                        {txn.waiverPriority != null && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                            Waiver #{txn.waiverPriority}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10.5px] text-dim tnum">
                          {timeLabel(txn.processedAt)} · Wk {txn.week}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        {isTrade ? (
                          <TradeBody txn={txn} teams={byId} />
                        ) : (
                          <div className="space-y-1">
                            {txn.items.map((i, idx) => (
                              <PlayerLine
                                key={idx}
                                name={i.playerName}
                                position={i.position}
                                nflTeam={i.nflTeam}
                                action={i.action}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

    </AppShell>
  )
}

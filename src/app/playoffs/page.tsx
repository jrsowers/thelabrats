import type { Metadata } from 'next'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, BracketIcon } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Playoff Picture' }

/**
 * The seeding engine (§21.7) is not built yet, and before any game is final
 * there is genuinely nothing to seed — so this is an honest empty state (§38)
 * rather than a placeholder. It states the rules it will apply, which is real
 * information a manager can use today.
 */
export default async function PlayoffsPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-8 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <Eyebrow>Playoff Picture</Eyebrow>
          <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Road In</h1>
        </div>
      </header>

      <div className="rounded-lg border border-border bg-surface px-6 py-14 text-center">
        <div className="mx-auto mb-4 w-fit text-dim"><BracketIcon size={34} /></div>
        <h2 className="display text-2xl">Nothing to seed yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          The bracket opens once Week 1 results are final. Until then every team is
          tied at 0–0 and any projection would be invented rather than calculated.
        </p>

        <dl className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 text-left">
          {[
            ['Berths', String(overview.playoffTeamCount)],
            ['Byes', '2'],
            ['Seeding', overview.seedingRule?.replace(/_/g, ' ') ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface-2 px-3.5 py-3">
              <dt className="eyebrow">{label}</dt>
              <dd className="display mt-1.5 text-[22px] tnum">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 font-mono text-[10.5px] uppercase tracking-wider text-dim">
          Regular season ends after week {overview.regularSeasonWeeks}
        </p>
      </div>
    </AppShell>
  )
}

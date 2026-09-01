import type { Metadata } from 'next'
import Link from 'next/link'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, EmptyState } from '@/components/ui/primitives'
import { GradeStamp } from '@/components/draft/grade-stamp'
import { getDraftRecap } from '@/lib/draft/recap-data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Draft Recap',
  robots: { index: false, follow: false },
}

export default async function DraftRecapPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const recap = getDraftRecap()

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-6 overflow-hidden border-b border-border px-4 pb-5 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Eyebrow>Draft Recap</Eyebrow>
          <Link href="/draft" className="tap-target inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-text">
            ← Every pick
          </Link>
        </div>
      </header>

      {recap.sample && recap.feature && (
        <div
          className="state-bar mb-6 rounded-lg border border-border bg-warn-soft px-4 py-3"
          style={{ '--state': 'var(--warn)' } as React.CSSProperties}
        >
          <Eyebrow>Sample Data</Eyebrow>
          <p className="mt-1 text-[13.5px] leading-relaxed text-text">
            Written from a simulated draft so the page could be built early.
            Every name and verdict here is a placeholder.
          </p>
        </div>
      )}

      {!recap.feature ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title="No recap yet." hint="It lands once the draft is done." />
        </div>
      ) : (
        <>
          {/* The feature. Full width, the lead story on the page. */}
          <article className="mb-10 border-b border-border pb-8">
            <h1 className="display text-[38px] leading-[1.02] sm:text-[56px]">
              {recap.feature.headline}
            </h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[18px]">
              {recap.feature.standfirst}
            </p>
            <div className="mt-6 max-w-2xl">
              {recap.feature.body.map((para, i) => (
                <p key={i} className="mb-4 text-[15.5px] leading-[1.7]">{para}</p>
              ))}
            </div>
          </article>

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="display text-[30px] sm:text-[34px]">The Report Cards</h2>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
              All twelve · all F
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recap.teams.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/draft/recap/${t.slug}`}
                  className="state-bar group flex h-full flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-2/60"
                  style={{ '--state': 'var(--loss)' } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="display text-[21px] leading-tight">{t.manager}</div>
                      <div className="truncate text-[12px] text-muted">{t.teamName}</div>
                    </div>
                    <GradeStamp grade={t.grade} size="sm" />
                  </div>
                  <div className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-dim">
                    {t.verdict}
                  </div>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">{t.teaser}</p>
                  <span className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-brand">
                    Read the damage →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  )
}

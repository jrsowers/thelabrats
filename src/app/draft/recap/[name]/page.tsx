import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { Eyebrow } from '@/components/ui/primitives'
import { GradeStamp } from '@/components/draft/grade-stamp'
import { getDraftRecap, teamRecapBySlug } from '@/lib/draft/recap-data'
import { getDraftFeed, picksByTeam } from '@/lib/draft/feed-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ name: string }> },
): Promise<Metadata> {
  const { name } = await params
  const t = teamRecapBySlug(name)
  return {
    title: t ? `${t.manager}'s Draft — Grade F` : 'Recap not found',
    robots: { index: false, follow: false },
  }
}

export default async function TeamRecapPage(
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params
  const overview = await getLeagueOverview()
  if (!overview) return null

  const recap = teamRecapBySlug(name)
  if (!recap) notFound()

  const all = getDraftRecap()
  const others = all.teams.filter((t) => t.slug !== recap.slug)
  const picks = picksByTeam(getDraftFeed().picks).get(recap.teamId) ?? []

  return (
    <AppShell leagueName={overview.leagueName}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/draft/recap"
          className="tap-target mb-5 inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-text"
        >
          ← All report cards
        </Link>

        <header className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <Eyebrow>Draft Report Card</Eyebrow>
            <h1 className="display mt-1.5 text-[34px] leading-none sm:text-[44px]">
              {recap.manager}
            </h1>
            <p className="mt-1 text-[13.5px] text-muted">{recap.teamName}</p>
            <p className="mt-2.5 font-mono text-[11px] uppercase tracking-wider text-dim">
              {recap.verdict}
            </p>
          </div>
          <GradeStamp grade={recap.grade} size="lg" />
        </header>

        <div className="mt-6">
          {recap.body.map((para, i) => (
            <p key={i} className="mb-4 text-[15.5px] leading-[1.7]">{para}</p>
          ))}
        </div>

        {picks.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 border-b border-border pb-1.5">
              <h2 className="display text-xl">The Evidence</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {picks.map((p) => (
                  <li key={p.overallPickNumber} className="flex items-baseline gap-3 bg-surface px-3.5 py-2.5">
                    <span className="w-11 shrink-0 font-mono text-[11px] tabular-nums text-dim">
                      {p.round}.{String(p.roundPick).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="display text-[15px]">{p.player}</span>
                      <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-dim">
                        {p.position}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-dim">
                      #{p.leagueRank}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-border pt-5">
          <Eyebrow>Everyone else also failed</Eyebrow>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {others.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/draft/recap/${t.slug}`}
                  className="tap-target inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-[12.5px] transition-colors hover:bg-surface-2"
                >
                  {t.manager}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}

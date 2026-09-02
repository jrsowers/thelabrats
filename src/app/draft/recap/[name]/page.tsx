import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { Eyebrow } from '@/components/ui/primitives'
import { GradeStamp } from '@/components/draft/grade-stamp'
import { getDraftRecap, teamRecapBySlug } from '@/lib/draft/recap-data'
import { getDraftFeed, picksByTeam } from '@/lib/draft/feed-data'
import { assignBadges } from '@/lib/draft/badges'

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
  const picks = picksByTeam((await getDraftFeed()).picks).get(recap.teamId) ?? []
  const badges = assignBadges(picks)

  return (
    <AppShell leagueName={overview.leagueName}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/draft/recap"
          className="tap-target mb-5 inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-text"
        >
          ← All report cards
        </Link>

        <header className="border-b border-border pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {recap.managerPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recap.managerPhoto}
                  alt=""
                  width={48}
                  height={48}
                  loading="eager"
                  decoding="async"
                  className="size-12 shrink-0 rounded-full border border-border object-cover"
                />
              )}
              <div className="min-w-0">
                <Eyebrow>Draft Report Card</Eyebrow>
                <h2 className="display mt-1 text-[26px] leading-none sm:text-[32px]">
                  {recap.managerFull}
                </h2>
                <p className="mt-0.5 text-[13px] text-muted">{recap.teamName}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-dim">
                Draft<br />Grade:
              </span>
              <GradeStamp grade={recap.grade} size="lg" />
            </div>
          </div>

          {/* The verdict is the article headline, so it gets article treatment. */}
          <h1 className="display mt-6 text-[32px] leading-[1.05] sm:text-[44px]">
            {recap.verdict}
          </h1>
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
                {picks.map((p) => {
                  const badge = badges.get(p.overallPickNumber)
                  return (
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
                      {badge && (
                        <span
                          title={badge.title}
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                            badge.tone === 'good' ? 'bg-live-soft text-live'
                            : badge.tone === 'bad' ? 'bg-loss-soft text-loss'
                            : 'bg-warn-soft text-warn'
                          }`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-border pt-5">
          <Eyebrow>Don&rsquo;t worry. Everyone else failed too.</Eyebrow>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {others.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/draft/recap/${t.slug}`}
                  className="tap-target inline-flex items-center gap-2.5 rounded-lg border border-border bg-surface py-2 pl-2 pr-4 text-[14px] font-medium transition-colors hover:bg-surface-2"
                >
                  {t.managerPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.managerPhoto}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      className="size-9 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span aria-hidden className="size-9 shrink-0 rounded-full bg-surface-2" />
                  )}
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

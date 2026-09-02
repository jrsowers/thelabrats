import type { Metadata } from 'next'
import Link from 'next/link'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { Eyebrow, EmptyState } from '@/components/ui/primitives'
import { GradeStamp } from '@/components/draft/grade-stamp'
import { RecapHero } from '@/components/draft/recap-hero'
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

  if (!recap.feature) {
    return (
      <AppShell leagueName={overview.leagueName}>
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-surface">
          <EmptyState title="No recap yet." hint="It lands once the draft is done." />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell leagueName={overview.leagueName}>
      <RecapHero headline={recap.feature.headline} standfirst={recap.feature.standfirst} />

      {/* Single column, centred — same measure as an individual report card,
          because this is an article and articles are read in one column. */}
      <div className="mx-auto max-w-2xl">
        <Link
          href="/draft"
          className="tap-target mb-6 inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-text"
        >
          ← Every pick
        </Link>

        <article>
          {recap.feature.sections.map((section) => (
            <section key={section.heading} className="mb-8">
              <h2 className="display mb-2.5 text-[26px] leading-tight sm:text-[32px]">
                {section.heading}
              </h2>
              {section.body.map((para, i) => (
                <p key={i} className="mb-4 text-[15.5px] leading-[1.7]">{para}</p>
              ))}
            </section>
          ))}
        </article>

        <section className="mt-10 border-t border-border pt-7">
          <h2 className="display mb-4 text-[30px] sm:text-[34px]">The Report Cards</h2>

          <ul className="grid gap-4 sm:grid-cols-2">
            {recap.teams.map((t) => (
              <li key={t.slug}>
                <div
                  className="state-bar flex h-full flex-col rounded-lg border border-border bg-surface p-4"
                  style={{ '--state': 'var(--loss)' } as React.CSSProperties}
                >
                  {/* Wraps at the narrowest widths: photo + name + label +
                      stamp is more than 320px can hold on one line. */}
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                    {t.managerPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.managerPhoto}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="size-10 shrink-0 rounded-full border border-border object-cover"
                      />
                    )}
                    <div className="min-w-[7rem] flex-1">
                      <div className="display truncate text-[19px] leading-tight">{t.managerFull}</div>
                      <div className="truncate text-[12px] text-muted">{t.teamName}</div>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[9.5px] uppercase leading-tight tracking-[0.14em] text-dim">
                        Draft<br />Grade:
                      </span>
                      <GradeStamp grade={t.grade} size="sm" />
                    </div>
                  </div>

                  <div className="mt-3 font-mono text-[10.5px] uppercase tracking-wider text-dim">
                    {t.verdict}
                  </div>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">{t.teaser}</p>

                  <Link
                    href={`/draft/recap/${t.slug}`}
                    className="tap-target mt-4 inline-flex items-center justify-center rounded-md bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-brand-ink transition-opacity hover:opacity-90"
                  >
                    See the damage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}

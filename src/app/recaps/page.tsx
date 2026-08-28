import type { Metadata } from 'next'
import Link from 'next/link'
import { getLeagueOverview } from '@/lib/league/queries'
import { publishedRecaps } from '@/content/recaps'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { RecapCover } from '@/components/ui/recap-cover'
import { Eyebrow, EmptyState } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Weekly Recaps' }

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  }).format(new Date(`${iso}T12:00:00Z`))

export default async function RecapsPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const recaps = publishedRecaps()
  const [lead, ...rest] = recaps

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-8 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <Eyebrow>Weekly Recaps</Eyebrow>
          <h1 className="display mt-1.5 text-[40px] sm:text-[52px]">The Post-Game</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            What actually happened, who deserves credit, and who is going to hear
            about it in the group chat.
          </p>
        </div>
      </header>

      {recaps.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            title="No recaps published yet."
            hint="The first one lands after week 1 is final."
          />
        </div>
      ) : (
        <>
          {/* Lead story — the most recent recap gets the wide treatment. */}
          <article className="mb-8 overflow-hidden rounded-lg border border-border bg-surface">
            <Link href={`/recaps/${lead.slug}`} className="group block">
              <RecapCover week={lead.week} size="hero" className="h-48 sm:h-64" />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2.5">
                  <Eyebrow>{lead.week === 0 ? 'Preseason' : `Week ${lead.week}`}</Eyebrow>
                  <span className="font-mono text-[10.5px] text-dim">{fmtDate(lead.publishedAt)}</span>
                </div>
                <h2 className="display mt-2 text-[30px] leading-tight sm:text-[38px]">
                  {lead.title}
                </h2>
                <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-muted">
                  {lead.summary}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-brand-ink transition-colors group-hover:bg-brand-hover">
                  Read the recap
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          </article>

          {rest.length > 0 && (
            <section>
              <div className="mb-4 border-b border-border pb-1.5">
                <h2 className="display text-2xl">The Archive</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rest.map((r) => (
                  <article
                    key={r.slug}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    <Link href={`/recaps/${r.slug}`} className="group flex flex-1 flex-col">
                      <RecapCover week={r.week} className="h-32" />
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center gap-2">
                          <Eyebrow>Week {r.week}</Eyebrow>
                          <span className="font-mono text-[10px] text-dim">{fmtDate(r.publishedAt)}</span>
                        </div>
                        <h3 className="display mt-1.5 text-[19px] leading-tight">{r.title}</h3>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">
                          {r.summary}
                        </p>
                        <span className="mt-auto pt-3.5 font-mono text-[10.5px] uppercase tracking-wider text-brand group-hover:underline">
                          Read the recap →
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  )
}

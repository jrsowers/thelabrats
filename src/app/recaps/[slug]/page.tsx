import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLeagueOverview } from '@/lib/league/queries'
import { recapBySlug, publishedRecaps, type RecapBlock } from '@/content/recaps'
import { AppShell } from '@/components/navigation/app-shell'
import { RecapCover } from '@/components/ui/recap-cover'
import { Byline } from '@/components/ui/byline'
import { Eyebrow } from '@/components/ui/primitives'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const recap = recapBySlug(slug)
  if (!recap) return { title: 'Recap not found' }
  return { title: recap.title, description: recap.summary }
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  }).format(new Date(`${iso}T12:00:00Z`))

function Block({ block }: { block: RecapBlock }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="display mt-8 mb-2 text-[26px]">{block.text}</h2>
    case 'paragraph':
      return <p className="mb-4 text-[15.5px] leading-[1.7]">{block.text}</p>
    case 'stat':
      return (
        <div
          className="state-bar my-6 rounded-lg border border-border bg-surface-2/50 px-4 py-3.5"
          style={{ '--state': 'var(--brand)' } as React.CSSProperties}
        >
          <Eyebrow>{block.label}</Eyebrow>
          <div className="display mt-1 text-[19px] leading-snug">{block.value}</div>
          {block.note && <p className="mt-1.5 text-[12.5px] text-muted">{block.note}</p>}
        </div>
      )
    case 'scoreboard':
      return (
        <div className="my-6 overflow-hidden rounded-lg border border-border">
          {block.rows.map((r, i) => {
            const margin = r.winnerScore - r.loserScore
            return (
              <div
                key={i}
                className={`bg-surface px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                {/* Winner then loser, one per line. Names truncate and the
                    scores hold a fixed column, so a long team name can never
                    push a number off a 320px screen. */}
                <div className="flex items-baseline gap-3">
                  <span className="display min-w-0 flex-1 truncate text-[15px]">{r.winner}</span>
                  <span className="display shrink-0 text-[17px] tnum">
                    {r.winnerScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-3 text-muted">
                  <span className="min-w-0 flex-1 truncate text-[14px]">{r.loser}</span>
                  <span className="shrink-0 font-mono text-[14px] tnum">
                    {r.loserScore.toFixed(1)}
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-dim tnum">
                  by {margin.toFixed(1)}
                </div>
              </div>
            )
          })}
        </div>
      )
    case 'quote':
      return (
        <blockquote className="my-6 border-l-2 border-brand pl-4">
          <p className="display text-[21px] leading-snug">{block.text}</p>
          {block.attribution && (
            <cite className="mt-1.5 block font-mono text-[10.5px] not-italic uppercase tracking-wider text-dim">
              {block.attribution}
            </cite>
          )}
        </blockquote>
      )
  }
}

export default async function RecapPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const recap = recapBySlug(slug)
  if (!recap) notFound()

  const overview = await getLeagueOverview()
  if (!overview) return null

  const all = publishedRecaps()
  const index = all.findIndex((r) => r.slug === recap.slug)
  const newer = index > 0 ? all[index - 1] : null
  const older = index < all.length - 1 ? all[index + 1] : null

  return (
    <AppShell leagueName={overview.leagueName}>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/recaps"
          className="tap-target mb-5 inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-muted hover:text-text"
        >
          ← All recaps
        </Link>

        <RecapCover
          week={recap.week}
          src={recap.coverImage}
          alt={recap.coverAlt}
          size="hero"
          priority
          className="mb-6 h-44 rounded-lg sm:h-56"
        />

        <header className="mb-7 border-b border-border pb-5">
          <div className="flex items-center gap-2.5">
            <Eyebrow>{recap.week === 0 ? 'Preseason' : `Week ${recap.week}`}</Eyebrow>
            <span className="font-mono text-[10.5px] text-dim">{fmtDate(recap.publishedAt)}</span>
          </div>
          <h1 className="display mt-2 text-[38px] leading-none sm:text-[48px]">{recap.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{recap.summary}</p>
          {recap.author && (
            <div className="mt-4">
              <Byline author={recap.author} />
            </div>
          )}
        </header>

        <article>
          {recap.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        {recap.author && <Byline author={recap.author} variant="card" />}

        {(newer || older) && (
          <nav className="mt-10 flex items-stretch gap-3 border-t border-border pt-5">
            {older && (
              <Link
                href={`/recaps/${older.slug}`}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-2"
              >
                <Eyebrow>Previous</Eyebrow>
                <div className="display mt-1 text-[15px]">{older.title}</div>
              </Link>
            )}
            {newer && (
              <Link
                href={`/recaps/${newer.slug}`}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-right hover:bg-surface-2"
              >
                <Eyebrow>Next</Eyebrow>
                <div className="display mt-1 text-[15px]">{newer.title}</div>
              </Link>
            )}
          </nav>
        )}
      </div>
    </AppShell>
  )
}

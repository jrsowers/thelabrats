import type { Metadata } from 'next'
import Link from 'next/link'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, EmptyState, Tag, LiveBadge } from '@/components/ui/primitives'
import { PickRow, RoundMarker } from '@/components/draft/pick-row'
import { getDraftFeed, feedOrder, roasted } from '@/lib/draft/feed-data'

export const dynamic = 'force-dynamic'

/**
 * Roast content is deliberately kept out of search results. The jokes name real
 * NFL players and sit on a site carrying real people's names; anyone with the
 * link can read them, Google cannot index them.
 */
export const metadata: Metadata = {
  title: 'Draft Feed',
  robots: { index: false, follow: false },
}

export default async function DraftPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const feed = getDraftFeed()
  const picks = feedOrder(feed.picks, feed.complete)
  const commented = roasted(feed.picks).length

  // A round marker goes above the first pick of each round in DISPLAY order,
  // which works whichever direction the feed is running.
  const rows: React.ReactNode[] = []
  for (const [i, p] of picks.entries()) {
    const prev = picks[i - 1]
    if (!prev || prev.round !== p.round) rows.push(<RoundMarker key={`r${p.round}`} round={p.round} />)
    rows.push(<PickRow key={p.overallPickNumber} pick={p} />)
  }

  return (
    <AppShell leagueName={overview.leagueName}>
      <header className="relative -mx-4 mb-6 overflow-hidden border-b border-border px-4 pb-6 sm:-mx-6 sm:px-6">
        <FieldBackdrop />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2.5">
            <Eyebrow>Draft Day</Eyebrow>
            {feed.complete ? <Tag>Final</Tag> : <LiveBadge label="Live" />}
          </div>
          <h1 className="display mt-1.5 text-[40px] leading-none sm:text-[52px]">
            Every Pick, Judged
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            All {feed.picks.length} picks as they happen. {commented} of them get
            a comment they did not ask for.
          </p>
        </div>
      </header>

      {feed.sample && feed.picks.length > 0 && (
        <div
          className="state-bar mb-6 rounded-lg border border-border bg-warn-soft px-4 py-3"
          style={{ '--state': 'var(--warn)' } as React.CSSProperties}
        >
          <Eyebrow>Sample Data</Eyebrow>
          <p className="mt-1 text-[13.5px] leading-relaxed text-text">
            This is a simulated draft, used to build the page before the real one.
            Every name, pick and roast here is a placeholder.
          </p>
        </div>
      )}

      {feed.complete && (
        <Link
          href="/draft/recap"
          className="tap-target mb-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2/60"
        >
          <span>
            <span className="display block text-[19px]">Read the full draft recap</span>
            <span className="mt-0.5 block text-[12.5px] text-muted">
              The league-wide story, plus a report card for all 12 teams.
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-brand">→</span>
        </Link>
      )}

      {feed.picks.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            title="The draft has not started."
            hint="Picks appear here the moment they are made."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">{rows}</ul>
        </div>
      )}
    </AppShell>
  )
}

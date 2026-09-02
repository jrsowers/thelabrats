import type { Metadata } from 'next'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, EmptyState, LiveBadge } from '@/components/ui/primitives'
import { PickRow, RoundMarker } from '@/components/draft/pick-row'
import { getDraftFeed, feedOrder } from '@/lib/draft/feed-data'

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
            {!feed.complete && <LiveBadge label="Live" />}
          </div>
          <h1 className="display mt-1.5 text-[40px] leading-[1.02] sm:text-[52px]">
            Prepare to be judged. Harshly.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            We all know you&rsquo;re going to screw this up. Might as well have
            fun along the way.
          </p>
        </div>
      </header>

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

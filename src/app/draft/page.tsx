import type { Metadata } from 'next'
import { getLeagueOverview } from '@/lib/league/queries'
import { AppShell } from '@/components/navigation/app-shell'
import { FieldBackdrop } from '@/components/ui/field-backdrop'
import { Eyebrow, EmptyState, LiveBadge } from '@/components/ui/primitives'
import { PickRow, RoundMarker } from '@/components/draft/pick-row'
import { OnTheClockCard } from '@/components/draft/on-the-clock'
import { DraftCountdown } from '@/components/ui/draft-countdown'
import { RecapTeaser } from '@/components/draft/recap-teaser'
import { getDraftRecap } from '@/lib/draft/recap-data'
import { LiveRefresh } from '@/components/ui/live-refresh'
import { getDraftFeed, newestFirst } from '@/lib/draft/feed-data'

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

const fmtDraftDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    timeZone: 'America/New_York',
  }).format(new Date(iso))

export default async function DraftPage() {
  const overview = await getLeagueOverview()
  if (!overview) return null

  const feed = await getDraftFeed()
  // Only once the recap actually exists — no teaser for an unwritten article.
  const recap = getDraftRecap()
  const picks = newestFirst(feed.picks)

  // The start time has passed but no picks have arrived. Derived from the clock
  // rather than stored, so it needs no schema change and self-corrects.
  const underway =
    feed.picks.length === 0 &&
    overview.draftScheduledAt != null &&
    Date.now() >= new Date(overview.draftScheduledAt).getTime()

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

      {/* Poll while the draft is running; stop once it is done. 15s against a
          60s pick clock means a pick is on screen within a quarter of its own
          turn, and picks are cumulative so a missed tick costs nothing. */}
      <LiveRefresh intervalMs={15_000} active={!feed.complete} />

      {feed.complete && recap.feature && (
        <RecapTeaser
          headline={recap.feature.headline}
          standfirst={recap.feature.standfirst}
        />
      )}

      {/* Once picks exist the clock card takes over; before that the countdown
          is the more useful thing to look at. */}
      {feed.picks.length > 0 && feed.onTheClock && <OnTheClockCard next={feed.onTheClock} />}

      {feed.picks.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-brand/30 bg-brand-soft">
          <div className="px-5 py-6 text-center sm:py-8">
            {underway ? (
              <>
                {/*
                  ESPN's read API does not publish picks while a draft is
                  running — confirmed on the day, across draftDetail, rosters,
                  transactions and player ownership. Showing an expired
                  countdown here read as broken, so the page says what is
                  actually true and what will happen.
                */}
                <div className="display text-[26px] leading-tight sm:text-[32px]">
                  The draft is underway.
                </div>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
                  ESPN keeps picks to itself until the draft wraps, so nothing
                  shows here yet. Every pick, and every comment nobody asked
                  for, lands the moment it finishes.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-surface px-3 py-2">
                  <span className="live-dot shrink-0" aria-hidden />
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted">
                    Watching for results
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="display text-[26px] leading-tight sm:text-[32px]">
                  Nothing to judge yet.
                </div>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">
                  Every pick lands here the moment it is made, with commentary
                  nobody asked for. {overview.draftScheduledAt
                    ? `The draft starts ${fmtDraftDate(overview.draftScheduledAt)}.`
                    : 'Check back when the draft starts.'}
                </p>
                {overview.draftScheduledAt && (
                  <div className="mt-6 flex justify-center">
                    <DraftCountdown target={overview.draftScheduledAt} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">{rows}</ul>
        </div>
      )}
    </AppShell>
  )
}

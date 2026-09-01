import { Eyebrow } from '@/components/ui/primitives'
import type { FeedPick } from '@/lib/draft/feed-data'

const POS_TINT: Record<string, string> = {
  QB: 'var(--brand)', RB: 'var(--live)', WR: 'var(--warn)',
  TE: 'var(--loss)', K: 'var(--border-strong)', DST: 'var(--border-strong)',
}

/**
 * One pick in the feed.
 *
 * A roasted pick gets the full treatment; an ordinary one stays compact. Only a
 * third of picks are commented on, and giving all 180 equal weight would bury
 * the jokes in a wall of transactions.
 */
export function PickRow({ pick }: { pick: FeedPick }) {
  const hasRoast = pick.roast !== null

  return (
    <li
      className="state-bar bg-surface px-4 py-3.5 sm:px-5"
      style={{ '--state': hasRoast ? POS_TINT[pick.position] ?? 'var(--brand)' : 'transparent' } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-[11px] tabular-nums text-dim">
          {pick.round}.{String(pick.roundPick).padStart(2, '0')}
        </span>
        <span className="display text-[17px] leading-tight sm:text-[19px]">{pick.player}</span>
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
          {pick.position}{pick.proTeam ? ` · ${pick.proTeam}` : ''}
        </span>
      </div>

      <div className="mt-0.5 text-[12.5px] text-muted">
        <span className="font-medium text-text">{pick.manager}</span>
        <span className="text-dim"> · {pick.teamName}</span>
      </div>

      {hasRoast && (
        <p className="mt-2.5 text-[14px] leading-relaxed text-text">{pick.roast!.text}</p>
      )}
    </li>
  )
}

/** The round divider in the feed. */
export function RoundMarker({ round }: { round: number }) {
  return (
    <li className="bg-surface-2/60 px-4 py-1.5 sm:px-5">
      <Eyebrow>Round {round}</Eyebrow>
    </li>
  )
}

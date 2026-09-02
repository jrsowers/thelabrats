import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { isTeamDefense, type FeedPick } from '@/lib/draft/feed-data'

const POS_TINT: Record<string, string> = {
  QB: 'var(--brand)', RB: 'var(--live)', WR: 'var(--warn)',
  TE: 'var(--loss)', K: 'var(--border-strong)', DST: 'var(--border-strong)',
}

/**
 * One pick in the feed.
 *
 * Every row is the same height whether or not it carries a roast, so the feed
 * scans as a uniform board rather than a ragged list. The roast area is always
 * reserved; on an uncommented pick it simply sits empty.
 */
export function PickRow({ pick }: { pick: FeedPick }) {
  const dst = isTeamDefense(pick)

  return (
    <li
      className="state-bar flex min-h-[132px] flex-col bg-surface px-4 py-3.5 sm:min-h-[124px] sm:px-5"
      style={{ '--state': pick.roast ? POS_TINT[pick.position] ?? 'var(--brand)' : 'transparent' } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <PlayerHeadshot
          espnPlayerId={pick.playerId}
          name={pick.player}
          size={44}
          teamAbbrev={pick.proTeam}
          isTeamDefense={dst}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] tabular-nums text-dim">
              {pick.round}.{String(pick.roundPick).padStart(2, '0')}
            </span>
            <span className="display text-[17px] leading-tight sm:text-[19px]">{pick.player}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
              {pick.position}{pick.proTeam && !dst ? ` · ${pick.proTeam}` : ''}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
            {pick.managerPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pick.managerPhoto}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                decoding="async"
                className="size-5 shrink-0 rounded-full border border-border object-cover"
              />
            )}
            <span className="truncate">
              <span className="font-medium text-text">{pick.manager}</span>
              <span className="text-dim"> · {pick.teamName}</span>
            </span>
          </div>
        </div>
      </div>

      {/*
        Reserved on every row, which is what keeps the feed level.

        An uncommented pick shows its draft context rather than empty space.
        Equalising all 180 rows to the tallest roast would have run the mobile
        page 1.6x longer and left ~157px blank on each of 120 cards; this fills
        the same area with the numbers the roasts are judged against anyway.
      */}
      <div className="mt-2.5 flex flex-1 items-start">
        {pick.roast ? (
          <p className="text-[14px] leading-relaxed text-text">{pick.roast.text}</p>
        ) : (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-dim">
            <div className="flex gap-1.5">
              <dt className="uppercase tracking-wider">Board</dt>
              <dd className="tabular-nums text-muted">#{pick.leagueRank}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="uppercase tracking-wider">ADP</dt>
              <dd className="tabular-nums text-muted">
                {pick.adp >= 9999 ? '—' : pick.adp.toFixed(1)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="uppercase tracking-wider">Left on board</dt>
              <dd className="tabular-nums text-muted">{pick.betterAvailable}</dd>
            </div>
          </dl>
        )}
      </div>
    </li>
  )
}

/** The round divider in the feed. */
export function RoundMarker({ round }: { round: number }) {
  return (
    <li className="bg-brand px-4 py-2.5 sm:px-5">
      <h2 className="display text-[19px] leading-none text-brand-ink sm:text-[22px]">
        Round {round}
      </h2>
    </li>
  )
}

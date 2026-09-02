import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { isTeamDefense, type FeedPick } from '@/lib/draft/feed-data'

const POS_TINT: Record<string, string> = {
  QB: 'var(--brand)', RB: 'var(--live)', WR: 'var(--warn)',
  TE: 'var(--loss)', K: 'var(--border-strong)', DST: 'var(--border-strong)',
}

/**
 * One pick in the feed.
 *
 * Three zones: a grey pick-number strip down the left, the player on the left
 * of the body, and the drafting manager in the top right. The roast, when there
 * is one, runs full width beneath.
 *
 * The 88px floor is a compromise. Rows were briefly made truly uniform by
 * filling uncommented picks with their board rank and ADP, but that metadata
 * was cut — so a commented row (~212px on a phone) is now genuinely taller than
 * an uncommented one. The floor keeps the short rows from looking cramped
 * without opening the ~120px of dead space that matching the tallest would
 * require on 120 of 180 picks.
 */
export function PickRow({ pick }: { pick: FeedPick }) {
  const dst = isTeamDefense(pick)

  return (
    <li
      className="state-bar flex min-h-[88px] items-stretch bg-surface"
      style={{ '--state': pick.roast ? POS_TINT[pick.position] ?? 'var(--brand)' : 'transparent' } as React.CSSProperties}
    >
      {/* Pick number. Stacked rather than on one line so the strip can stay
          narrow enough to leave the body usable at 320px. */}
      <div className="flex w-[58px] shrink-0 flex-col justify-center border-r border-border bg-surface-2 px-2 py-3 text-center sm:w-[68px]">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-dim">Pick</span>
        <span className="display mt-0.5 text-[15px] leading-none text-muted tabular-nums sm:text-[17px]">
          {pick.round}.{String(pick.roundPick).padStart(2, '0')}
        </span>
      </div>

      <div className="min-w-0 flex-1 px-3.5 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-start justify-between gap-3">
          {/* Player */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <PlayerHeadshot
              espnPlayerId={pick.playerId}
              name={pick.player}
              size={40}
              teamAbbrev={pick.proTeam}
              isTeamDefense={dst}
            />
            <div className="min-w-0">
              <div className="display truncate text-[16px] leading-tight sm:text-[19px]">
                {pick.player}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-dim sm:text-[10.5px]">
                {pick.position}{pick.proTeam && !dst ? ` · ${pick.proTeam}` : ''}
              </div>
            </div>
          </div>

          {/*
            Drafting manager. Capped and truncating rather than hidden below a
            breakpoint: at 360px, showing the full team name clipped the PLAYER
            name instead, and the player is the more important half of the row.
          */}
          <div className="flex min-w-0 max-w-[42%] shrink items-center gap-1.5 sm:max-w-[45%]">
            {pick.managerPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pick.managerPhoto}
                alt=""
                width={22}
                height={22}
                loading="lazy"
                decoding="async"
                className="size-[22px] shrink-0 rounded-full border border-border object-cover"
              />
            )}
            <span className="truncate text-[12px] text-muted sm:text-[12.5px]">
              {pick.teamName}
            </span>
          </div>
        </div>

        {pick.roast && (
          <p className="mt-2.5 text-[14px] leading-relaxed text-text">
            {/* Unnamed on purpose — the prefix gives it identity without
                inventing a mascot nobody asked for. */}
            <span className="font-semibold tracking-wide">PEER REVIEW:</span>{' '}
            {pick.roast.text}
          </p>
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

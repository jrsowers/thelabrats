import type { MatchupRow as Matchup, MatchupSide } from '@/lib/league/queries'
import { Tag, LiveBadge, TeamAvatar } from '@/components/ui/primitives'

/**
 * The signature component. Broadcast lower-third: identity outward, scores inward.
 *
 * Borrows from the references without copying either — Yahoo's record-under-name
 * and projected-under-score, ESPN's team logos, our own condensed display voice.
 *
 * Rules:
 *  - The score is the loudest thing in the row.
 *  - Team name primary, manager secondary (agreed display convention).
 *  - A live leader is marked, never declared a winner (§19.2).
 *  - State is carried by a bar AND a label, never color alone (§39).
 *  - Below sm the two sides STACK. Squeezed into three columns at 390px each
 *    side got ~77px of name, which truncated every team to 'TYLER'S T...'
 *    and wrapped the record mid-token. Stacked, each side owns the full
 *    width and the avatar earns its place back.
 */
function Side({
  side, leading, align = 'left',
}: {
  side: MatchupSide | null
  leading: boolean
  align?: 'left' | 'right'
}) {
  const right = align === 'right'

  if (!side) {
    return <div className={right ? 'text-right' : ''}><span className="display text-[17px] text-dim">TBD</span></div>
  }

  return (
    <div className={`flex min-w-0 items-center gap-3 ${right ? 'sm:flex-row-reverse sm:text-right' : ''}`}>
      <div className="shrink-0">
        <TeamAvatar
          photoUrl={side.photoUrl}
          logoUrl={side.logoUrl}
          abbrev={side.abbrev}
          champion={side.isChampion}
          championYear={side.championYear}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="display truncate text-[17px] leading-tight sm:text-[19px]">{side.name}</div>
        <div className={`flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted ${right ? 'sm:justify-end' : ''}`}>
          <span className="shrink-0 whitespace-nowrap font-mono tnum">{side.record}</span>
          {side.manager && (
            <>
              <span className="text-dim" aria-hidden>·</span>
              <span className="truncate">{side.manager}</span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0">
          <div className={`display text-[30px] leading-none tnum sm:text-[34px] ${leading ? 'text-text' : 'text-dim'}`}>
            {side.score.toFixed(1)}
          </div>
        {side.projected != null && (
          <div className="mt-1 font-mono text-[10px] text-dim tnum">
            proj {side.projected.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}

export function MatchupRow({ matchup, index }: { matchup: Matchup; index: number }) {
  const { home, away, status } = matchup
  const isFinal = status === 'FINAL'
  const isLive = status === 'LIVE'
  // Scores show in every state, including 0.0 before kickoff. Both Yahoo and
  // ESPN do this, and an empty column reads as broken rather than as pregame.

  const homeLeads = (home?.score ?? 0) > (away?.score ?? 0)
  const awayLeads = (away?.score ?? 0) > (home?.score ?? 0)

  return (
    <li
      className="state-bar flex flex-col gap-2.5 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6 sm:px-5"
      style={{ '--state': isLive ? 'var(--live)' : isFinal ? 'var(--border-strong)' : 'transparent' } as React.CSSProperties}
    >
      <Side side={away} leading={awayLeads} />

      <div className="flex shrink-0 flex-row items-center justify-center gap-2 sm:flex-col sm:gap-1">
        {isLive ? (
          <LiveBadge />
        ) : isFinal ? (
          <Tag>Final</Tag>
        ) : (
          <>
            <span className="eyebrow !tracking-[0.18em]">vs</span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-dim">
              Game {String(index + 1).padStart(2, '0')}
            </span>
          </>
        )}
      </div>

      <Side side={home} leading={homeLeads} align="right" />
    </li>
  )
}

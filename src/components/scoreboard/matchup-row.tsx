import type { MatchupRow as Matchup, MatchupSide } from '@/lib/league/queries'
import { Tag, LiveBadge } from '@/components/ui/primitives'

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
 */
/**
 * Identity, in order of preference:
 *   1. the league member's own photo (editorial, supplied by the commissioner)
 *   2. the ESPN team logo
 *   3. the mono abbreviation chip
 *
 * A real face beats a stock helmet — it makes the scoreboard read as this
 * league rather than any league.
 */
function TeamLogo({ side }: { side: MatchupSide }) {
  const src = side.photoUrl ?? side.logoUrl
  if (src) {
    const isPhoto = Boolean(side.photoUrl)
    return (
      // Plain <img>: ESPN logos are remote SVGs and next/image would need
      // dangerouslyAllowSVG. Not worth the risk for a 36px mark.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className={`size-9 shrink-0 border border-border bg-surface-2 object-cover ${isPhoto ? 'rounded-full' : 'rounded-md'}`}
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-[10px] font-bold text-muted"
    >
      {side.abbrev ?? '—'}
    </div>
  )
}

function Side({
  side, leading, showScore, align = 'left',
}: {
  side: MatchupSide | null
  leading: boolean
  showScore: boolean
  align?: 'left' | 'right'
}) {
  const right = align === 'right'

  if (!side) {
    return <div className={right ? 'text-right' : ''}><span className="display text-[17px] text-dim">TBD</span></div>
  }

  return (
    <div className={`flex min-w-0 items-center gap-3 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <div className="hidden sm:block"><TeamLogo side={side} /></div>

      <div className="min-w-0 flex-1">
        <div className="display truncate text-[17px] leading-tight sm:text-[19px]">{side.name}</div>
        <div className={`flex items-center gap-1.5 text-[11.5px] text-muted ${right ? 'justify-end' : ''}`}>
          <span className="font-mono tnum">{side.record}</span>
          {side.manager && (
            <>
              <span className="text-dim" aria-hidden>·</span>
              <span className="truncate">{side.manager}</span>
            </>
          )}
        </div>
      </div>

      {showScore && (
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
      )}
    </div>
  )
}

export function MatchupRow({ matchup, index }: { matchup: Matchup; index: number }) {
  const { home, away, status } = matchup
  const isFinal = status === 'FINAL'
  const isLive = status === 'LIVE'
  const showScore = isFinal || isLive

  const homeLeads = (home?.score ?? 0) > (away?.score ?? 0)
  const awayLeads = (away?.score ?? 0) > (home?.score ?? 0)

  return (
    <li
      className="state-bar grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:gap-6 sm:px-5"
      style={{ '--state': isLive ? 'var(--live)' : isFinal ? 'var(--border-strong)' : 'transparent' } as React.CSSProperties}
    >
      <Side side={away} leading={awayLeads} showScore={showScore} />

      <div className="flex shrink-0 flex-col items-center gap-1">
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

      <Side side={home} leading={homeLeads} showScore={showScore} align="right" />
    </li>
  )
}

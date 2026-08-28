import type { MatchupRow as Matchup } from '@/lib/league/queries'
import { Tag, LiveBadge } from '@/components/ui/primitives'

/**
 * The signature component. Broadcast lower-third: team identity left,
 * score right, status centered.
 *
 * Rules:
 *  - The score is the loudest thing in the row.
 *  - Team name primary, manager secondary (agreed display convention).
 *  - A live leader is marked, never declared a winner (§19.2).
 *  - State is carried by a bar AND a label, never color alone (§39).
 */
function Side({
  name, manager, abbrev, score, leading, showScore, align = 'left',
}: {
  name: string | null
  manager: string | null
  abbrev: string | null
  score: number
  leading: boolean
  showScore: boolean
  align?: 'left' | 'right'
}) {
  const right = align === 'right'
  return (
    <div className={`flex min-w-0 items-center gap-3 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <div
        aria-hidden
        className="hidden size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-[10px] font-bold tracking-tight text-muted sm:flex"
      >
        {abbrev ?? '—'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="display truncate text-[17px] leading-tight sm:text-[19px]">
          {name ?? 'TBD'}
        </div>
        {manager && <div className="truncate text-[11.5px] text-muted">{manager}</div>}
      </div>
      {showScore && (
        <div
          className={`display shrink-0 text-[30px] tnum sm:text-[34px] ${leading ? 'text-text' : 'text-dim'}`}
        >
          {score.toFixed(1)}
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

  const stateColor = isLive ? 'var(--live)' : isFinal ? 'var(--border-strong)' : 'transparent'

  return (
    <li
      className="state-bar grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:gap-6 sm:px-5"
      style={{ '--state': stateColor } as React.CSSProperties}
    >
      <Side
        name={away?.name ?? null} manager={away?.manager ?? null} abbrev={away?.abbrev ?? null}
        score={away?.score ?? 0} leading={awayLeads} showScore={showScore}
      />

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

      <Side
        name={home?.name ?? null} manager={home?.manager ?? null} abbrev={home?.abbrev ?? null}
        score={home?.score ?? 0} leading={homeLeads} showScore={showScore}
        align="right"
      />
    </li>
  )
}

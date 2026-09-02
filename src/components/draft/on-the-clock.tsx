import type { OnTheClock } from '@/lib/draft/feed-data'

/**
 * Who the draft is waiting on.
 *
 * This is the page's "still live" signal, and it sits at the top because the
 * feed runs newest-first — a spinner at the bottom would mark the spot where
 * nothing ever happens.
 *
 * It says something real rather than spinning: ESPN pre-seeds the entire snake
 * order, so the next unused slot already knows whose turn it is.
 */
export function OnTheClockCard({ next }: { next: OnTheClock }) {
  return (
    <div
      className="state-bar mb-5 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5"
      style={{ '--state': 'var(--live)' } as React.CSSProperties}
      aria-live="polite"
    >
      <span className="live-dot shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-live">
          On the clock
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          {next.managerPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={next.managerPhoto}
              alt=""
              width={24}
              height={24}
              loading="eager"
              decoding="async"
              className="size-6 shrink-0 rounded-full border border-border object-cover"
            />
          )}
          <span className="display truncate text-[19px] leading-tight sm:text-[22px]">
            {next.manager}
          </span>
          <span className="truncate text-[12.5px] text-muted">{next.teamName}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-dim">Pick</div>
        <div className="display text-[17px] leading-none tabular-nums sm:text-[19px]">
          {next.round}.{String(next.roundPick).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, type ReactNode } from 'react'

/**
 * Award card with a frosted-glass reveal.
 *
 * The title and its description stay legible; everything else — who won, why,
 * the number — sits behind a blur until the card is revealed.
 *
 * Hover alone would be a trap: it does not exist on touch, and it strands
 * keyboard users. So the reveal fires three ways —
 *   • pointer hover        (desktop)
 *   • tap / click          (touch)
 *   • keyboard focus       (Tab, Enter, Space)
 * — and a page-level "Reveal all" exists for anyone who just wants to read.
 *
 * The content is only ever blurred, never removed from the DOM or hidden with
 * `aria-hidden`, so screen readers get the whole card regardless. A visual
 * effect should not become an accessibility wall.
 */
export function RevealCard({
  accent,
  revealAll,
  header,
  children,
}: {
  accent: string
  revealAll: boolean
  header: ReactNode
  children: ReactNode
}) {
  const [pinned, setPinned] = useState(false)
  const revealed = revealAll || pinned

  return (
    <article
      className="state-bar reveal-card relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors focus-within:border-border-strong hover:border-border-strong"
      data-revealed={revealed ? 'true' : 'false'}
      style={{ '--state': accent } as React.CSSProperties}
    >
      {header}

      {/* Interactive layer. A button so Enter and Space work for free and the
          expanded state is announced. */}
      <button
        type="button"
        aria-expanded={revealed}
        aria-label={revealed ? 'Hide award detail' : 'Reveal award detail'}
        onClick={() => setPinned((p) => !p)}
        className="relative flex-1 cursor-pointer text-left"
      >
        <div className="reveal-body flex h-full flex-col gap-3 px-4 py-3.5">
          {children}
        </div>

        {/* Prompt, which fades out as the card comes into focus. */}
        <span
          aria-hidden
          className="reveal-hint pointer-events-none absolute inset-x-0 bottom-3 flex justify-center font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted"
        >
          Reveal
        </span>
      </button>
    </article>
  )
}

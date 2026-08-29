'use client'

import { useState, type ReactNode } from 'react'
import { RevealCard } from '@/components/ui/reveal-card'
import { RevealAllToggle } from '@/components/ui/reveal-all-toggle'

export interface GridItem {
  key: string
  accent: string
  header: ReactNode
  body: ReactNode
}

/**
 * Owns the reveal state for the whole page, so one switch clears every card.
 * The cards themselves stay server-rendered and arrive as children — only the
 * reveal behaviour is client-side.
 */
export function AwardGrid({
  toolbar,
  sections,
}: {
  /** Week selector, rendered opposite the reveal switch. */
  toolbar?: ReactNode
  sections: { key: string; heading: string; items: GridItem[] }[]
}) {
  const [revealAll, setRevealAll] = useState(false)

  return (
    <>
      {/* One control row: week on the left, reveal on the right. Keeping them
          on the same line makes it obvious they both act on the cards below,
          which was not clear when the selector sat up in the header. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>{toolbar}</div>
        <RevealAllToggle revealAll={revealAll} onChange={setRevealAll} />
      </div>

      {sections.map((section) => (
        <section key={section.key} className="mb-12">
          <div className="mb-5 border-b border-border pb-2">
            {/* Deliberately larger than an award name: the section sits a level
                above it in the hierarchy and should read that way. */}
            <h2 className="display text-[34px] leading-none sm:text-[38px]">
              {section.heading}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {section.items.map((item) => (
              <RevealCard
                key={item.key}
                accent={item.accent}
                revealAll={revealAll}
                header={item.header}
              >
                {item.body}
              </RevealCard>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

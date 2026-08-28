'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'
import { LabSeal } from '@/components/ui/primitives'

/**
 * Persistent left rail (PRODUCT_SPEC §3.1), the FantasyPros pattern.
 * The rail stays dark in both themes — it reads as chrome, not content,
 * and keeps the eye on the scores.
 *
 * Mobile: collapses to a bottom bar rather than eating 25-30% of the width.
 */
export function SideNav({ leagueName, season }: { leagueName: string; season: number }) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/8 bg-rail lg:flex"
      >
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="shrink-0"><LabSeal size={38} /></div>
          <div className="min-w-0">
            <div className="display truncate text-[17px] text-rail-text">{leagueName}</div>
            <div className="eyebrow mt-0.5 !text-rail-muted">{season} Season</div>
          </div>
        </div>

        <ul className="mt-2 flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-disabled={!item.ready}
                  className={[
                    'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                    active
                      ? 'bg-brand text-brand-ink'
                      : item.ready
                        ? 'text-rail-text/85 hover:bg-white/6 hover:text-rail-text'
                        : 'cursor-not-allowed text-rail-muted/60',
                  ].join(' ')}
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {!item.ready && (
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-rail-muted/70">
                      Soon
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-white/8 px-4 py-3">
          <p className="font-mono text-[10px] leading-relaxed text-rail-muted">
            ESPN is the system of record.
            <br />
            This is the lab.
          </p>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-rail lg:hidden"
      >
        <ul className="flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                    active ? 'text-brand' : item.ready ? 'text-rail-text/70' : 'text-rail-muted/50',
                  ].join(' ')}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{item.short}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

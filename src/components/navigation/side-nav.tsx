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
export function SideNav({
  leagueName, season, logoUrl,
}: { leagueName: string; season: number; logoUrl: string | null }) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-white/8 bg-rail lg:flex"
      >
        {/* Home link. Absolute URL so it always lands on the canonical domain,
            per James's request, rather than whichever preview host is serving. */}
        <a
          href="https://www.labratsfantasy.com"
          className="block px-4 py-5 transition-opacity hover:opacity-85"
          aria-label={`${leagueName} — home`}
        >
          {logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={leagueName}
                className="h-auto w-full max-w-[176px]"
                loading="eager"
                decoding="async"
              />
              <div className="eyebrow mt-2 !text-rail-muted">{season} Season</div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="shrink-0"><LabSeal size={38} /></div>
              <div className="min-w-0">
                <div className="display truncate text-[17px] text-rail-text">{leagueName}</div>
                <div className="eyebrow mt-0.5 !text-rail-muted">{season} Season</div>
              </div>
            </div>
          )}
        </a>

        <ul className="mt-2 flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            const body = (
              <>
                <Icon size={16} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{item.label}</span>
                {!item.ready && (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-rail-muted/70">
                    Soon
                  </span>
                )}
              </>
            )

            const base =
              'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors'

            // Unbuilt sections are NOT links. As <Link> they were real anchors,
            // so Next prefetched routes that do not exist (404s in the console)
            // and a click landed on a 404 page.
            if (!item.ready) {
              return (
                <li key={item.href}>
                  <span aria-disabled className={`${base} cursor-not-allowed text-rail-muted/60`}>
                    {body}
                  </span>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`${base} ${active ? 'bg-brand text-brand-ink' : 'text-rail-text/85 hover:bg-white/6 hover:text-rail-text'}`}
                >
                  {body}
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
            const base = 'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium'
            const body = (
              <>
                <Icon size={18} strokeWidth={2} />
                <span>{item.short}</span>
              </>
            )
            return (
              <li key={item.href} className="flex-1">
                {item.ready ? (
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${base} ${active ? 'text-brand' : 'text-rail-text/70'}`}
                  >
                    {body}
                  </Link>
                ) : (
                  <span aria-disabled className={`${base} text-rail-muted/50`}>{body}</span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

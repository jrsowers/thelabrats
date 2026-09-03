'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_ITEMS } from './nav-items'
import { LabSeal } from '@/components/ui/primitives'

/**
 * Persistent left rail (PRODUCT_SPEC §3.1), the FantasyPros pattern.
 * The rail stays dark in both themes — it reads as chrome, not content,
 * and keeps the eye on the scores.
 *
 * Mobile: a fixed top bar with a hamburger opening a slide-in panel.
 */
export function SideNav({
  leagueName, logoUrl,
}: { leagueName: string; logoUrl: string | null }) {
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
          className="block px-4 pb-2 pt-6 transition-opacity hover:opacity-85"
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
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="shrink-0"><LabSeal size={38} /></div>
              <div className="min-w-0">
                <div className="display truncate text-[17px] text-rail-text">{leagueName}</div>
              </div>
            </div>
          )}
        </a>

        <ul className="mt-9 flex-1 space-y-0.5 px-2">
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

      </nav>

      {/* Mobile: a fixed top bar with a hamburger, and a slide-in panel. */}
      <MobileNav leagueName={leagueName} logoUrl={logoUrl} pathname={pathname} />
    </>
  )
}

/**
 * Mobile navigation.
 *
 * Replaces the bottom bar, which had run out of room. Eight destinations across
 * 320px left each 40px, under the 44px touch floor, and the fix at the time was
 * a second row eating ~9.5rem of every page. A panel holds any number of items
 * at a comfortable size and gives the bottom of the screen back.
 *
 * It also fixes something the bottom bar never had: the league's name and mark
 * were invisible on mobile, since the logo only ever lived in the desktop rail.
 */
function MobileNav({
  leagueName, logoUrl, pathname,
}: { leagueName: string; logoUrl: string | null; pathname: string }) {
  const [open, setOpen] = useState(false)

  // Close on route change, or the panel stays open over the page just opened.
  useEffect(() => { setOpen(false) }, [pathname])

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-white/8 bg-rail px-3 pt-[env(safe-area-inset-top)] lg:hidden">
        <a
          href="https://www.labratsfantasy.com"
          className="flex min-w-0 items-center py-2"
          aria-label={`${leagueName} — home`}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={leagueName} className="h-8 w-auto max-w-[150px]" loading="eager" decoding="async" />
          ) : (
            <span className="display truncate text-[15px] text-rail-text">{leagueName}</span>
          )}
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav-panel"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="tap-target -mr-1 flex items-center justify-center rounded-md px-2 text-rail-text transition-colors hover:bg-white/8"
        >
          {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
      </header>

      {/* Scrim. Tapping anywhere off the panel closes it. */}
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <nav
        id="mobile-nav-panel"
        aria-label="Primary"
        hidden={!open}
        className="fixed inset-y-0 right-0 z-50 w-[78%] max-w-xs overflow-y-auto border-l border-white/8 bg-rail pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] lg:hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="eyebrow !text-rail-muted">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="tap-target flex items-center justify-center rounded-md px-2 text-rail-text hover:bg-white/8"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <ul className="px-2 pb-6">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            const base =
              'tap-target flex w-full items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium'
            const body = (
              <>
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{item.label}</span>
                {!item.ready && (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-rail-muted/70">
                    Soon
                  </span>
                )}
              </>
            )
            return (
              <li key={item.href}>
                {item.ready ? (
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${base} ${active ? 'bg-brand text-brand-ink' : 'text-rail-text/85 hover:bg-white/6'}`}
                  >
                    {body}
                  </Link>
                ) : (
                  <span aria-disabled className={`${base} cursor-not-allowed text-rail-muted/60`}>
                    {body}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

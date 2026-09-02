import type { ReactNode } from 'react'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { SideNav } from './side-nav'

const RAIL_LOGO = 'brand/lab-rats-logo-rail.png'

/**
 * Server component, so it can check on disk whether the brand logo has been
 * generated yet. Until `scripts/make-logo-transparent.py` has been run the rail
 * falls back to the seal and wordmark — no broken image, and no code change
 * needed once the file lands.
 */
export function AppShell({
  leagueName, children,
}: { leagueName: string; children: ReactNode }) {
  const logoUrl = existsSync(join(process.cwd(), 'public', RAIL_LOGO)) ? `/${RAIL_LOGO}` : null

  return (
    <div className="min-h-full">
      <SideNav leagueName={leagueName} logoUrl={logoUrl} />
      {/* Rail is 14rem on desktop; bottom bar needs clearance on mobile. */}
      <div className="lg:pl-56">
        <main
          id="content"
          className="mx-auto max-w-6xl px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

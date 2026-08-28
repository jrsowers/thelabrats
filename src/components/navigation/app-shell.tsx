import type { ReactNode } from 'react'
import { SideNav } from './side-nav'

export function AppShell({
  leagueName, season, children,
}: { leagueName: string; season: number; children: ReactNode }) {
  return (
    <div className="min-h-full">
      <SideNav leagueName={leagueName} season={season} />
      {/* Rail is 14rem on desktop; bottom bar needs clearance on mobile. */}
      <div className="lg:pl-56">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  )
}

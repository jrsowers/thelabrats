import type { ComponentType } from 'react'
import { Radio, Trophy, Award, ArrowLeftRight, BookOpen, Newspaper, ListOrdered } from 'lucide-react'
import { BracketIcon } from '@/components/ui/primitives'

/** Lucide icons and our own BracketIcon both satisfy this. */
type IconComponent = ComponentType<{
  size?: number
  strokeWidth?: number
  className?: string
}>

export interface NavItem {
  href: string
  label: string
  /**
   * Abbreviated label, kept from the mobile bottom bar. Nothing reads it now
   * that mobile uses a panel with room for the full label, but it is left in
   * place rather than deleted — a compact nav may want it again.
   */
  short: string
  icon: IconComponent
  ready: boolean
}

/**
 * Order set by James, 2026-08-28. Draft Room added and promoted to the top
 * on 2026-09-02, ahead of the draft.
 *
 * /admin, /awards and /recaps are deliberately absent — reachable by URL only.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/draft',        label: 'Draft Room',       short: 'Draft',   icon: ListOrdered,    ready: true  },
  { href: '/',             label: 'Live Scoreboard',  short: 'Scores',  icon: Radio,          ready: true  },
  { href: '/standings',    label: 'League Standings', short: 'Table',   icon: Trophy,         ready: true  },
  { href: '/playoffs',     label: 'Playoff Picture',  short: 'Bracket', icon: BracketIcon,    ready: true  },
  { href: '/transactions', label: 'Transaction Log',  short: 'Moves',   icon: ArrowLeftRight, ready: true  },
  { href: '/recaps',       label: 'Weekly Recaps',    short: 'Recaps',  icon: Newspaper,      ready: false },
  { href: '/awards',       label: 'Studs & Duds',     short: 'Awards',  icon: Award,          ready: false },
  { href: '/records',      label: 'Record Books',     short: 'Records', icon: BookOpen,       ready: true  },
]

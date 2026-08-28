import type { ComponentType } from 'react'
import { Radio, Trophy, Award, ArrowLeftRight, BookOpen } from 'lucide-react'
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
  short: string
  icon: IconComponent
  ready: boolean
}

/** Order is fixed by PRODUCT_SPEC §3.1. Do not reorder. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/',             label: 'Live Scoreboard', short: 'Scores',  icon: Radio,          ready: true },
  { href: '/standings',    label: 'League Standings', short: 'Table',  icon: Trophy,         ready: true  },
  { href: '/playoffs',     label: 'Playoff Picture',  short: 'Bracket',icon: BracketIcon,    ready: true  },
  { href: '/awards',       label: 'Studs & Duds',     short: 'Awards', icon: Award,          ready: false },
  { href: '/transactions', label: 'Transaction Log',  short: 'Moves',  icon: ArrowLeftRight, ready: false },
  { href: '/records',      label: 'Record Books',     short: 'Records',icon: BookOpen,       ready: false },
]

import {
  Radio, Trophy, GitBranch, Award, ArrowLeftRight, BookOpen, type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  short: string
  icon: LucideIcon
  ready: boolean
}

/** Order is fixed by PRODUCT_SPEC §3.1. Do not reorder. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/',             label: 'Live Scoreboard', short: 'Scores',  icon: Radio,          ready: true },
  { href: '/standings',    label: 'League Standings', short: 'Table',  icon: Trophy,         ready: false },
  { href: '/playoffs',     label: 'Playoff Picture',  short: 'Bracket',icon: GitBranch,      ready: false },
  { href: '/awards',       label: 'Studs & Duds',     short: 'Awards', icon: Award,          ready: false },
  { href: '/transactions', label: 'Transaction Log',  short: 'Moves',  icon: ArrowLeftRight, ready: false },
  { href: '/records',      label: 'Record Books',     short: 'Records',icon: BookOpen,       ready: false },
]

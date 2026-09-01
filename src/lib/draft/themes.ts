import type { PickAnalysis } from './types'

/**
 * Roast themes.
 *
 * The engine decides which themes a pick can SUPPORT; the scheduler decides
 * which one it gets. Keeping eligibility deterministic is what stops the writer
 * reaching for "he drafted a handcuff" when no handcuff exists.
 */
export const THEMES = [
  'COST_TO_VALUE',
  'POSITIONAL_IMBALANCE',
  'NEWS_CYCLE',
  'AGAINST_THE_GRAIN',
  'FOLLOWING_THE_CROWD',
  'COPIUM',
  'HANDCUFF',
  'STACKING',
  'NOSTALGIA',
  'SUPERFLEX_MALPRACTICE',
  'THE_ROBOT',
  'BACKHANDED_COMPLIMENT',
] as const

export type RoastTheme = (typeof THEMES)[number]

export const THEME_ANGLE: Record<RoastTheme, string> = {
  COST_TO_VALUE: 'Better players were sitting right there. Name one.',
  POSITIONAL_IMBALANCE: 'The roster shape is absurd. Count it out.',
  NEWS_CYCLE: 'Something true and recent about this player, from the dossier.',
  AGAINST_THE_GRAIN: 'Nobody else in America would have made this pick here.',
  FOLLOWING_THE_CROWD: 'The safest, most obvious pick available. No courage.',
  COPIUM: 'List what would ALL have to be true for this to work out.',
  HANDCUFF: 'He drafted the backup to a player he already owns. Hedging against himself.',
  STACKING: 'Multiple players from one NFL team. A jersey collection, not a roster.',
  NOSTALGIA: 'He drafted the version of this player from three seasons ago.',
  SUPERFLEX_MALPRACTICE: 'Two QB slots start. He is not filling them.',
  THE_ROBOT: 'The autodrafter made this pick, and made it better than he would have.',
  BACKHANDED_COMPLIMENT: 'A genuinely correct pick. Treat it as an accident.',
}

export interface ThemeInput {
  pick: PickAnalysis
  /** Player names the news dossier has verified material for. */
  dossierNames?: Set<string>
  totalRounds: number
}

/**
 * Which themes this pick can honestly support.
 *
 * A theme is only eligible when the facts back it. NEWS_CYCLE requires an
 * actual dossier entry, so the writer can never invent a headline.
 */
export function eligibleThemes({ pick, dossierNames, totalRounds }: ThemeInput): RoastTheme[] {
  const t: RoastTheme[] = []
  const r = pick.rosterAfter
  const pos = pick.player.pos

  if (pick.betterAvailable >= 12 && pick.bestAvailable) t.push('COST_TO_VALUE')
  if ((r[pos] ?? 0) >= 4 || (r.QB === 0 && pick.round >= 6)) t.push('POSITIONAL_IMBALANCE')
  if (dossierNames?.has(pick.player.name)) t.push('NEWS_CYCLE')

  // A lonely opinion needs to be lonely on BOTH boards. Every superflex QB
  // looks bold against standard ADP — that is the format working as intended,
  // not courage. It only counts if he also went early on the superflex board.
  if (pick.adpSlots >= 25 && pick.reachSlots >= 8) t.push('AGAINST_THE_GRAIN')

  // Correct on the superflex board but wild against national ADP is chalk here.
  if (pick.adpSlots >= 25 && pick.reachSlots < 8 && pick.round <= 3) {
    t.push('FOLLOWING_THE_CROWD')
  }

  // Chalk: right around his rank, right around ADP, early enough to matter.
  if (Math.abs(pick.reachSlots) <= 4 && Math.abs(pick.adpSlots) <= 12 && pick.round <= 4) {
    t.push('FOLLOWING_THE_CROWD')
  }

  if (pick.flags.includes('INJURED') || (pick.betterAvailable >= 20 && pick.round <= 8)) {
    t.push('COPIUM')
  }
  if (pick.isHandcuff) t.push('HANDCUFF')
  if (pick.sameProTeamAlreadyRostered.length >= 1 && !pick.isHandcuff) t.push('STACKING')
  if (dossierNames?.has(pick.player.name) && pick.round <= 10) t.push('NOSTALGIA')
  if (pick.flags.includes('NO_QB_LATE')) t.push('SUPERFLEX_MALPRACTICE')
  if (pick.autodrafted) t.push('THE_ROBOT')
  if (pick.flags.includes('BEST_AVAILABLE') && pick.round <= totalRounds - 3) {
    t.push('BACKHANDED_COMPLIMENT')
  }

  // Always leave the scheduler a choice. With a single option it is forced to
  // repeat whatever the previous pick used, which reads as a broken bot.
  const generic: RoastTheme[] = pick.betterAvailable === 0
    ? ['BACKHANDED_COMPLIMENT', 'FOLLOWING_THE_CROWD']
    : ['COST_TO_VALUE', 'COPIUM']
  for (const g of generic) {
    if (t.length >= 2) break
    if (!t.includes(g)) t.push(g)
  }
  return t
}

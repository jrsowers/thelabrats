import type { FeedPick } from './feed-data'

/**
 * Verdict badges for a manager's pick list.
 *
 * Computed, not written. A model asked to label picks would happily call the
 * same pick a STEAL on one page and a WTF on another; these come straight off
 * the analysis, so the label always matches the numbers underneath it.
 *
 * Deliberately sparse. If every pick carries a badge, none of them mean
 * anything — most picks are unremarkable and get nothing.
 */
export type BadgeTone = 'good' | 'bad' | 'neutral'

export interface Badge { label: string; tone: BadgeTone; title: string }

export function badgeFor(pick: FeedPick, totalRounds = 15): Badge | null {
  const { position, round, betterAvailable, reachSlots } = pick

  // Kickers and defenses have their own scale of wrong.
  const lateRoundStart = totalRounds - 1
  if (position === 'K' && round < lateRoundStart - 1) {
    return { label: 'U OK BRO?', tone: 'bad', title: `A kicker in round ${round}.` }
  }
  if (position === 'DST' && round < lateRoundStart - 1) {
    return { label: 'WHY', tone: 'bad', title: `A defense in round ${round}.` }
  }

  // Reaches: how many better players were sitting there.
  if (betterAvailable >= 40) {
    return { label: 'WTF', tone: 'bad', title: `${betterAvailable} better players were still available.` }
  }
  if (betterAvailable >= 22) {
    return { label: 'U OK BRO?', tone: 'bad', title: `${betterAvailable} better players were still available.` }
  }
  if (betterAvailable >= 12) {
    return { label: 'REACH', tone: 'bad', title: `${betterAvailable} better players were still available.` }
  }

  // Value: he lasted past where the board had him. Calibrated to a 12-team
  // league, where a 10-slot fall is most of a round and 20 is nearly two.
  // The first thresholds were -15 and -30, which never fired once across six
  // managers — the good badges simply did not exist.
  if (reachSlots <= -20) {
    return { label: 'ROBBERY', tone: 'good', title: `Fell ${Math.abs(reachSlots)} slots past his rank.` }
  }
  if (reachSlots <= -10) {
    return { label: 'STEAL', tone: 'good', title: `Fell ${Math.abs(reachSlots)} slots past his rank.` }
  }

  // No "best available" badge. It fired on seven of Chenell's fifteen picks,
  // which made the badges look like a status column instead of a verdict, and
  // it is analysis rather than a joke. Badges should be rare enough to read.

  return null
}

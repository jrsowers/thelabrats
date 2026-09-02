import type { FeedPick } from './feed-data'

/**
 * Verdict badges for a manager's pick list.
 *
 * Assigned PER MANAGER, not per pick. Judging each pick on its own left one
 * manager with eleven badges and another with none, and produced no positives
 * at all across six managers — the thresholds happened to miss. Ranking a
 * manager's own picks against each other guarantees a readable, consistent
 * spread on every page.
 *
 * The mix is deliberately unkind: roughly three bad, three mildly bad, one
 * good. Everybody here scored an F, and the evidence column should look like
 * the reason rather than argue with it.
 */
export type BadgeTone = 'bad' | 'meh' | 'good'

export interface Badge { label: string; tone: BadgeTone; title: string }

export const BADGE_TARGET = { bad: 3, meh: 3, good: 1 } as const
/** Nobody's evidence should look empty. */
export const MIN_BADGES = 5

/** Four of each, chosen by what the pick actually did. */
const BAD = ['WTF?', 'U OK BRO?', 'NO. NO. NO.', 'WHY, THOUGH'] as const
const MEH = ['MEH', 'OK, I GUESS', 'SURE, FINE', 'BOLD OF YOU'] as const
const GOOD = ['CHA-CHING', 'SWISH', 'STEAL', 'MONEY PICK'] as const

/**
 * How bad a pick was, on one scale, so a manager's picks can be ranked against
 * each other. Higher is worse.
 */
function regret(p: FeedPick, totalRounds: number): number {
  let n = p.betterAvailable
  // A kicker or defense with real players left is its own category of wrong.
  if (p.position === 'K' && p.round < totalRounds - 2) n += 45
  if (p.position === 'DST' && p.round < totalRounds - 2) n += 35
  // Value pulls the other way.
  if (p.reachSlots < 0) n += p.reachSlots
  return n
}

/** Deterministic pick from a list, so a page never changes between loads. */
const choose = <T,>(list: readonly T[], seed: number): T => list[seed % list.length]

export function assignBadges(
  picks: FeedPick[], totalRounds = 15,
): Map<number, Badge> {
  const out = new Map<number, Badge>()
  if (picks.length === 0) return out

  const ranked = [...picks].sort((a, b) => regret(b, totalRounds) - regret(a, totalRounds))

  const worst = ranked.slice(0, BADGE_TARGET.bad)
  const middle = ranked.slice(BADGE_TARGET.bad, BADGE_TARGET.bad + BADGE_TARGET.meh)
  const best = ranked.slice(-BADGE_TARGET.good)

  for (const p of worst) {
    const label =
      p.position === 'K' && p.round < totalRounds - 2 ? 'U OK BRO?'
      : p.position === 'DST' && p.round < totalRounds - 2 ? 'WHY, THOUGH'
      : p.betterAvailable >= 30 ? 'WTF?'
      : choose(BAD, p.overallPickNumber)
    out.set(p.overallPickNumber, {
      label, tone: 'bad',
      title: `${p.betterAvailable} better players were still on the board.`,
    })
  }

  for (const p of middle) {
    if (out.has(p.overallPickNumber)) continue
    out.set(p.overallPickNumber, {
      label: choose(MEH, p.overallPickNumber), tone: 'meh',
      title: `${p.betterAvailable} better players were still on the board.`,
    })
  }

  for (const p of best) {
    if (out.has(p.overallPickNumber)) continue
    // Only a genuinely huge fall earns ROBBERY; everything else rotates
    // through the pool. A `<= -5 ? STEAL` rule here meant CHA-CHING, SWISH and
    // MONEY PICK never once appeared across all twelve managers.
    const label = p.reachSlots <= -12 ? 'ROBBERY' : choose(GOOD, p.overallPickNumber)
    out.set(p.overallPickNumber, {
      label, tone: 'good',
      title: p.reachSlots < 0
        ? `Fell ${Math.abs(p.reachSlots)} slots past his rank.`
        : 'The best player on the board at the time.',
    })
  }

  // Top up to the floor from whatever is left, worst first.
  for (const p of ranked) {
    if (out.size >= MIN_BADGES) break
    if (out.has(p.overallPickNumber)) continue
    out.set(p.overallPickNumber, {
      label: choose(MEH, p.overallPickNumber), tone: 'meh',
      title: `${p.betterAvailable} better players were still on the board.`,
    })
  }

  return out
}

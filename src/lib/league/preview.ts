/**
 * Simulated live scoring, for seeing what a Sunday actually looks like when no
 * games are running (PRODUCT_SPEC §16).
 *
 * Two rules make this safe:
 *  1. It NEVER touches the database. It decorates rows on their way to the view,
 *     so no simulated number can be mistaken for, or overwrite, a real one.
 *  2. It is deterministic — seeded from matchup id and week — so the page does
 *     not reshuffle on every render and a screenshot is reproducible.
 *
 * Every screen using it must show the preview banner. Simulated data that looks
 * real is worse than no data at all.
 */
import type { MatchupRow } from './queries'

/** mulberry32 — small, fast, good enough for plausible-looking scores. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * A believable mid-Sunday: a couple of early games final, most in progress,
 * one waiting on Monday night. Chosen to exercise every visual state at once.
 */
function statusFor(index: number, total: number): MatchupRow['status'] {
  if (index < Math.min(2, total)) return 'FINAL'
  if (index === total - 1) return 'SCHEDULED'
  return 'LIVE'
}

export function applyLivePreview(matchups: MatchupRow[], week: number): MatchupRow[] {
  return matchups.map((m, i) => {
    const status = statusFor(i, matchups.length)
    const r = rng(m.id * 7919 + week * 104729)

    const side = (record: string) => {
      const projected = round1(between(r, 96, 141))
      if (status === 'SCHEDULED') return { score: 0, projected, record }
      if (status === 'LIVE') {
        // Partway through the slate: a fraction of the projection is banked.
        const pace = between(r, 0.34, 0.78)
        return { score: round1(projected * pace), projected, record }
      }
      // Final games drift from their projection in both directions.
      return { score: round1(projected * between(r, 0.72, 1.28)), projected: null, record }
    }

    // Records reflect the weeks already played, so week 1 stays 0-0.
    const played = Math.max(0, week - 1)
    const wins = played === 0 ? 0 : Math.round(between(r, 0, played))
    const awayRec = `${wins}-${played - wins}`
    const homeRec = `${played - wins}-${wins}`

    const away = m.away ? { ...m.away, ...side(awayRec) } : null
    const home = m.home ? { ...m.home, ...side(homeRec) } : null

    return { ...m, status, away, home }
  })
}

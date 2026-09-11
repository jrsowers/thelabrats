/**
 * When a week's awards are published.
 *
 * James's call, 2026-09-11: generate ONCE, Tuesday morning. Awards that shift
 * under you through a Sunday are worse than awards that arrive a day late — a
 * Stud named at 2pm and taken away by the 4pm slate is a bug report, not a
 * feature. So Studs & Duds is a week in review, settled and permanent.
 *
 * Pure and testable: it takes the clock and the world's state and returns a
 * decision. No I/O.
 *
 * ⚠️ NOT A CRON EXPRESSION. The same reasoning as lib/sync/cadence.ts applies —
 * a job pinned to "Tuesday 06:00" fires once and, if that tick is lost to a
 * deploy or an outage, the week silently never gets awards. This is a
 * CONDITION the existing two-minute sync evaluates, so the first tick after
 * any outage catches up on its own, and a week that finalizes late is picked up
 * whenever it finalizes rather than waiting a further seven days.
 */

/** Tuesday. `Date.getUTCDay()` numbering, but read in US Eastern. */
const TUESDAY = 2

/** Not before this hour, US Eastern. "Tuesday morning", concretely. */
export const RELEASE_HOUR_ET = 6

export interface ReleaseInput {
  now: Date
  /** Weeks whose every matchup is FINAL, ascending. */
  finalWeeks: number[]
  /** Weeks that already have award rows. */
  generatedWeeks: number[]
}

export interface ReleaseDecision {
  /** Weeks to generate now, ascending. Empty means nothing is due. */
  weeks: number[]
  reason: string
}

/** Weekday and hour in US Eastern, the league's timezone. */
function easternParts(now: Date): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
  // Eastern midnight formats as hour 24, not 0, under hour12: false.
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? -1) % 24
  return { day, hour }
}

/**
 * Has the release moment for the most recent slate passed?
 *
 * Open from Tuesday 06:00 ET through Saturday; closed Sunday and Monday.
 *
 * Sunday and Monday are the slate itself, and a week can LOOK finished at
 * Sunday teatime with Monday night still to come — releasing then is exactly
 * the mid-week churn this whole module exists to prevent.
 *
 * Staying open Wednesday to Saturday is what makes it self-healing: a week
 * that finalizes late, or a Tuesday tick lost to a deploy, is picked up on the
 * next sync rather than waiting a further seven days.
 */
function releaseWindowOpen(now: Date): boolean {
  const { day, hour } = easternParts(now)
  if (day === TUESDAY) return hour >= RELEASE_HOUR_ET
  if (day === 0 || day === 1) return false
  return true
}

export function decideRelease(input: ReleaseInput): ReleaseDecision {
  const { now, finalWeeks, generatedWeeks } = input
  const already = new Set(generatedWeeks)
  const pending = finalWeeks.filter((w) => !already.has(w)).sort((a, b) => a - b)

  if (pending.length === 0) {
    return {
      weeks: [],
      reason: finalWeeks.length === 0
        ? 'no week has finished yet'
        : 'every finished week already has awards',
    }
  }
  if (!releaseWindowOpen(now)) {
    return { weeks: [], reason: `week ${pending.join(', ')} finished; holds until Tuesday morning` }
  }
  return { weeks: pending, reason: `releasing week ${pending.join(', ')}` }
}

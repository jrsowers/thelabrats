/**
 * Adaptive sync cadence.
 *
 * A single cron fires often; THIS decides whether there is anything worth
 * doing. That beats encoding game windows in cron expressions, which get flex
 * scheduling, overtime and international kickoffs wrong — and which quietly
 * keep firing all offseason.
 *
 * Pure and testable: it takes the clock and the world's state, and returns a
 * decision. No I/O.
 */

export type SyncAction = 'LIVE' | 'ROUTINE' | 'IDLE'

export interface CadenceInput {
  /** Current instant. */
  now: Date
  /**
   * When any matchup's score last actually moved.
   *
   * ⚠️ NOT "is a matchup open". A fantasy matchup is open continuously from the
   * Thursday kickoff to the Monday night whistle, four days that are mostly
   * not football; treating that as live meant polling every minute all Friday.
   * A moving score is the honest signal that a game is being played.
   */
  lastScoreChangeAt: Date | null
  /** When the last successful sync of each kind finished. */
  lastLiveSyncAt: Date | null
  lastRoutineSyncAt: Date | null
  /** False outside the NFL season — nothing changes, so do nothing. */
  seasonActive: boolean
}

export interface CadenceDecision {
  action: SyncAction
  reason: string
}

const MIN = 60_000

/** How stale each kind of data is allowed to get. */
export const LIVE_INTERVAL_MS = 1 * MIN
export const ROUTINE_INTERVAL_MS = 15 * MIN
export const OFFSEASON_INTERVAL_MS = 12 * 60 * MIN

/**
 * NFL game windows in US Eastern, the league's timezone.
 *
 * Only the three RELIABLE slates are listed: Sunday, Monday night, Thursday
 * night. Friday and Saturday games exist (Black Friday, Christmas, late-season
 * Saturdays) but are rare, and guessing at them meant treating every ordinary
 * Friday afternoon as live — 1,440 pointless syncs a week.
 *
 * Off-schedule games are still covered, because the escalation is self-healing:
 * the routine sync runs every 15 minutes regardless, so a surprise Saturday
 * kickoff moves a score within 15 minutes, and `lastScoreChangeAt` escalates to
 * live cadence on the next tick. A quarter-hour of lag on a game nobody
 * expected beats polling all season for games that mostly do not happen.
 */
function inGameWindow(now: Date): boolean {
  const et = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', hour: 'numeric', hour12: false,
  }).formatToParts(now)
  const day = et.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(et.find((p) => p.type === 'hour')?.value ?? -1)

  // Sunday: the 1pm slate through the end of the night game.
  if (day === 'Sun') return hour >= 12 && hour <= 23
  // Monday and Thursday night, including the tail past midnight.
  if (day === 'Mon') return hour >= 19 || hour <= 1
  if (day === 'Thu') return hour >= 19 || hour <= 1
  return false
}

/**
 * How long after the last score movement to keep polling every minute.
 *
 * Must comfortably exceed the routine interval, or a game that starts just
 * after a routine sync would not be noticed until its movement had already
 * gone stale. At 20 minutes against a 15-minute routine, a surprise Saturday
 * kickoff escalates on the tick after the routine sync that first sees it —
 * which is how the windows below get away with omitting Saturday entirely.
 */
export const SCORE_ACTIVE_MS = 20 * MIN

const since = (from: Date | null, now: Date) =>
  from === null ? Number.POSITIVE_INFINITY : now.getTime() - from.getTime()

export function decideSync(input: CadenceInput): CadenceDecision {
  const { now, lastScoreChangeAt, lastLiveSyncAt, lastRoutineSyncAt, seasonActive } = input

  if (!seasonActive) {
    return since(lastRoutineSyncAt, now) >= OFFSEASON_INTERVAL_MS
      ? { action: 'ROUTINE', reason: 'offseason keepalive' }
      : { action: 'IDLE', reason: 'offseason, synced recently' }
  }

  // Scores actually moving outranks the clock: it covers overtime, weather
  // delays and the off-schedule slates the windows omit, and it stops on its
  // own when the last game ends. The window is the cold-start case — at
  // kickoff nothing has moved yet, so the clock has to open the door.
  const scoresMoving = since(lastScoreChangeAt, now) < SCORE_ACTIVE_MS
  const inWindow = inGameWindow(now)
  const live = scoresMoving || inWindow

  if (live && since(lastLiveSyncAt, now) >= LIVE_INTERVAL_MS) {
    return {
      action: 'LIVE',
      reason: scoresMoving ? 'scores are moving' : 'inside NFL game window',
    }
  }

  if (since(lastRoutineSyncAt, now) >= ROUTINE_INTERVAL_MS) {
    return { action: 'ROUTINE', reason: 'routine refresh due' }
  }

  return {
    action: 'IDLE',
    reason: live ? 'live sync ran within the last minute' : 'nothing due',
  }
}

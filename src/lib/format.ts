/** Shared display formatting. */

export const TZ = 'America/New_York'

/**
 * ESPN's standings-footer format: "Thu Jan 08 02:45am EST".
 * Shared by the standings table and the playoff projection, which must agree —
 * they are describing the same sync.
 */
export function fmtStandingsUpdate(iso: string | null): string | null {
  if (!iso) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: TZ, timeZoneName: 'short',
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('weekday')} ${get('month')} ${get('day')} ${get('hour')}:${get('minute')}${get('dayPeriod').toLowerCase()} ${get('timeZoneName')}`
}

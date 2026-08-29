/** Shared display formatting. */

export const TZ = 'America/New_York'

/**
 * The one sync timestamp format: "Aug 29, 10:50 AM EDT".
 *
 * Every page header shows the same sync, so they must render it identically —
 * a page that formats it differently reads as a different sync.
 */
export function fmtSyncTime(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: TZ, timeZoneName: 'short',
  }).format(new Date(iso))
}

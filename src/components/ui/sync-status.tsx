import { LiveRefresh } from './live-refresh'
import { fmtSyncTime } from '@/lib/format'

/**
 * The "Last data sync" block that sits at the right of every page header.
 *
 * One component rather than one per page: the timestamp describes a single
 * league-wide sync, so if two pages render it differently a reader reasonably
 * concludes their data is from different moments. Wording, format and
 * placement are the same everywhere by construction.
 *
 * `autoRefresh` should be true only while something can actually change —
 * see `hasActiveGames`. A live dot on a finished week is a lie.
 */
export function SyncStatus({
  finishedAt,
  autoRefresh = false,
}: { finishedAt: string | null | undefined; autoRefresh?: boolean }) {
  const stamp = fmtSyncTime(finishedAt ?? null)

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      {stamp && (
        <p className="font-mono text-[10.5px] text-dim tnum">
          <span className="font-bold text-muted">Last data sync:</span> {stamp}
        </p>
      )}
      <LiveRefresh active={autoRefresh} />
    </div>
  )
}

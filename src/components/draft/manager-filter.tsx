'use client'

import { useRouter } from 'next/navigation'

/**
 * Filters the feed to one manager's picks.
 *
 * Native <select> for the same reasons as the week picker: keyboard accessible
 * for free, platform picker on mobile, and it degrades to a plain control.
 *
 * The choice lives in the URL rather than in component state, so "here is how
 * it roasted me" is a link somebody can paste into the group chat.
 */
export interface ManagerOption { slug: string; label: string; roasts: number }

export function ManagerFilter({
  managers, selected, totalRoasts,
}: { managers: ManagerOption[]; selected: string | null; totalRoasts: number }) {
  const router = useRouter()

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor="manager-filter" className="eyebrow">Show</label>
      <div className="relative">
        <select
          id="manager-filter"
          value={selected ?? ''}
          onChange={(e) => {
            const v = e.target.value
            router.push(v ? `/draft?manager=${encodeURIComponent(v)}` : '/draft')
          }}
          className="tap-target appearance-none rounded-md border border-border bg-surface py-1.5 pl-3 pr-8 text-[13px] text-text outline-none transition-colors hover:border-border-strong focus:border-brand"
        >
          <option value="">Everybody ({totalRoasts} roasts)</option>
          {managers.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.label} ({m.roasts})
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted"
        >
          ▾
        </span>
      </div>

      {selected && (
        <a
          href="/draft"
          className="tap-target inline-flex items-center font-mono text-[10.5px] uppercase tracking-wider text-brand hover:underline"
        >
          Clear
        </a>
      )}
    </div>
  )
}

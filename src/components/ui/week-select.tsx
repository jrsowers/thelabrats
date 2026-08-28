'use client'

import { useRouter } from 'next/navigation'

/**
 * Week picker.
 *
 * A native <select> rather than a custom dropdown: it is keyboard accessible
 * for free, it uses the platform picker on mobile (which beats any wheel we
 * would build), and it degrades to a plain control if JS is slow to arrive.
 */
export function WeekSelect({
  week, weeks, currentWeek, basePath, extraParams = {},
}: {
  week: number
  weeks: number
  currentWeek: number
  basePath: string
  extraParams?: Record<string, string>
}) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="week-select" className="eyebrow">Week</label>
      <div className="relative">
        <select
          id="week-select"
          value={week}
          onChange={(e) => {
            const p = new URLSearchParams(extraParams)
            p.set('week', e.target.value)
            router.push(`${basePath}?${p.toString()}`)
          }}
          className="appearance-none rounded-md border border-border bg-surface py-1.5 pl-3 pr-8 font-mono text-[12.5px] tnum text-text outline-none transition-colors hover:border-border-strong focus:border-brand"
        >
          {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}{w === currentWeek ? ' — current' : ''}
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
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Eyebrow } from './primitives'

/**
 * Live countdown to draft time.
 *
 * Rendered client-side: the server has no idea what "now" is for the viewer, and
 * rendering a server-computed value would flash a stale figure on hydration.
 * Ticks every second. Seconds are shown deliberately: without them a countdown
 * looks frozen, and the point of putting it on the page is that it visibly moves.
 */
function parts(msRemaining: number) {
  const total = Math.max(0, msRemaining)
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1000),
  }
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="display text-[38px] leading-none text-brand tnum sm:text-[46px]">
        {String(value).padStart(2, '0')}
      </div>
      <Eyebrow className="mt-1 !text-[9.5px]">{label}</Eyebrow>
    </div>
  )
}

export function DraftCountdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(new Date(target).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  // Pre-hydration placeholder keeps the layout from jumping.
  if (remaining === null) {
    return <div className="h-[58px] w-[250px] sm:h-[66px]" aria-hidden />
  }

  if (remaining <= 0) {
    return (
      <div className="text-right">
        <div className="display text-[34px] leading-none text-brand">On the clock</div>
        <Eyebrow className="mt-1">Draft underway</Eyebrow>
      </div>
    )
  }

  const { days, hours, minutes, seconds } = parts(remaining)
  return (
    <div
      className="flex items-start gap-4 sm:gap-6"
      role="timer"
      /* Polite, not assertive: a per-second timer on an assertive region would
         make screen readers unusable. */
      aria-live="off"
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds until the draft`}
    >
      <Unit value={days} label="Days" />
      <Unit value={hours} label="Hrs" />
      <Unit value={minutes} label="Min" />
      <Unit value={seconds} label="Sec" />
    </div>
  )
}

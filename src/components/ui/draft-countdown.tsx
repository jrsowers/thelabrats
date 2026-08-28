'use client'

import { useEffect, useState } from 'react'
import { Eyebrow } from './primitives'

/**
 * Live countdown to draft time.
 *
 * Rendered client-side: the server has no idea what "now" is for the viewer, and
 * rendering a server-computed value would flash a stale figure on hydration.
 * Ticks every 30s — the display only resolves to minutes, so a 1s interval would
 * burn work for no visible gain.
 */
function parts(msRemaining: number) {
  const total = Math.max(0, msRemaining)
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
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
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [target])

  // Pre-hydration placeholder keeps the layout from jumping.
  if (remaining === null) {
    return <div className="h-[58px] w-[190px] sm:h-[66px]" aria-hidden />
  }

  if (remaining <= 0) {
    return (
      <div className="text-right">
        <div className="display text-[34px] leading-none text-brand">On the clock</div>
        <Eyebrow className="mt-1">Draft underway</Eyebrow>
      </div>
    )
  }

  const { days, hours, minutes } = parts(remaining)
  return (
    <div
      className="flex items-start gap-5 sm:gap-7"
      role="timer"
      aria-label={`${days} days, ${hours} hours and ${minutes} minutes until the draft`}
    >
      <Unit value={days} label="Days" />
      <Unit value={hours} label="Hrs" />
      <Unit value={minutes} label="Min" />
    </div>
  )
}

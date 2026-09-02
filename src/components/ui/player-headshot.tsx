'use client'

import { useState } from 'react'

/**
 * ESPN player headshot.
 *
 * Served from ESPN's image combiner at display size — the raw asset is ~240KB,
 * the combiner at 104px is ~16KB. A player with no photo returns a 404 rather
 * than a placeholder image, so the fallback is required, not optional: rookies,
 * practice-squad call-ups and team defences all miss.
 *
 * Client component purely so onError can swap in initials. Everything else
 * about the card stays server-rendered.
 */
export function PlayerHeadshot({
  espnPlayerId, name, size = 40, teamAbbrev = null, isTeamDefense = false,
}: {
  espnPlayerId: number | null
  name: string
  size?: number
  /** NFL team code, used for the D/ST logo. */
  teamAbbrev?: string | null
  /** Team defences have no headshot — ESPN serves a team logo instead. */
  isTeamDefense?: boolean
}) {
  const [failed, setFailed] = useState(false)

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // A D/ST has a negative player id and no headshot; its logo lives on a
  // different path entirely.
  const src = isTeamDefense
    ? (teamAbbrev
        ? `https://a.espncdn.com/i/teamlogos/nfl/500/${teamAbbrev.toLowerCase()}.png`
        : null)
    : (espnPlayerId != null
        ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${espnPlayerId}.png&w=${size * 2}&h=${size * 2}&scale=crop&cquality=80`
        : null)

  const showImage = src != null && !failed

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-border bg-surface-2"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={
            isTeamDefense
              ? 'size-full object-contain p-1'
              : 'size-full object-cover object-top'
          }
        />
      ) : (
        <span
          aria-hidden
          className="flex size-full items-center justify-center font-mono font-bold text-muted"
          style={{ fontSize: size * 0.34 }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}

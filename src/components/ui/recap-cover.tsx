/**
 * Featured image for a recap.
 *
 * Two modes, and the fallback is the point.
 *
 * With `src`, this renders the week's generated artwork with the week number
 * burned over it, so the cover is unmistakably THIS week's. Without one it
 * falls back to a generated field-and-numeral treatment, which means a recap
 * can always publish on text alone — the art is an upgrade, never a blocker.
 * Fourteen recaps a season is fourteen chances for image work to be the reason
 * a post sits in drafts.
 */
export function RecapCover({
  week, src, alt, className = '', size = 'card', priority = false,
}: {
  week: number
  /** Path under /public. Omit for the generated fallback. */
  src?: string
  alt?: string
  className?: string
  size?: 'card' | 'hero'
  priority?: boolean
}) {
  const isHero = size === 'hero'
  const label = week === 0 ? 'Preseason' : 'Weekly Recap'
  const title = week === 0 ? 'Kickoff' : `Week ${week}`

  return (
    <div
      className={`relative overflow-hidden bg-rail ${className}`}
      // Decorative when generated; when there is real art the alt text on the
      // <img> carries it, so the wrapper must not hide it from assistive tech.
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        <>
          {/* Plain <img>: these are pre-sized static JPEGs in /public and the
              only thing next/image would add here is a loader for an asset
              that is already the right dimensions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? `${title} recap`}
            className="absolute inset-0 h-full w-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
          />
          {/* The artwork is dark but not uniformly — this guarantees the
              overlaid type has something to sit on at any crop. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(6,9,16,0.88) 0%, rgba(6,9,16,0.45) 38%, rgba(6,9,16,0.10) 70%)',
            }}
          />
        </>
      ) : (
        <>
          {/* Field, cropped tight so the yard lines read as texture at this scale. */}
          <div className="field-lines absolute inset-0 opacity-[0.55]" />

          {/* Endzone-style wash from the corner. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 90% at 12% 8%, rgba(77,125,255,0.30) 0%, rgba(6,9,16,0.05) 55%, rgba(6,9,16,0.55) 100%)',
            }}
          />
        </>
      )}

      <div className={`relative flex h-full items-end justify-between ${isHero ? 'p-6 sm:p-8' : 'p-4'}`}>
        <div>
          <div
            className="font-mono uppercase tracking-[0.18em] text-rail-muted"
            style={{ fontSize: isHero ? 11 : 9.5 }}
          >
            {label}
          </div>
          {/* Fluid, and NEVER wrapped. At a fixed 64px "Week 1" broke onto two
              lines at 375px and the second line landed on top of the ghost
              numeral. Nothing overflowed the viewport, so the responsive suite
              passed it — this one is only visible by looking. */}
          <div
            className="display whitespace-nowrap leading-none text-rail-text"
            style={{ fontSize: isHero ? 'clamp(38px, 10.5vw, 64px)' : 'clamp(27px, 8vw, 40px)' }}
          >
            {title}
          </div>
        </div>

        {/* Oversized ghost numeral, like a jersey. Lifted over photography,
            which swallows the 8% white it uses over the flat fallback. */}
        {week > 0 && (
          <div
            className={`display leading-none tnum ${src ? 'text-white/14' : 'text-white/8'}`}
            style={{
              fontSize: isHero ? 'clamp(84px, 24vw, 150px)' : 'clamp(58px, 17vw, 90px)',
              marginBottom: isHero ? '-0.15em' : '-0.16em',
            }}
          >
            {String(week).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  )
}

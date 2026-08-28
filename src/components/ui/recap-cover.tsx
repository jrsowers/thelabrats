/**
 * Featured image for a recap.
 *
 * Generated rather than sourced: fourteen recaps a season would otherwise mean
 * fourteen pieces of art to find, licence, size and store. This renders from
 * the week number, so publishing a recap needs nothing but text — and every
 * cover is automatically on-brand.
 */
export function RecapCover({
  week, className = '', size = 'card',
}: { week: number; className?: string; size?: 'card' | 'hero' }) {
  const isHero = size === 'hero'
  return (
    <div
      className={`relative overflow-hidden bg-rail ${className}`}
      aria-hidden
    >
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

      <div className={`relative flex h-full items-end justify-between ${isHero ? 'p-6 sm:p-8' : 'p-4'}`}>
        <div>
          <div
            className="font-mono uppercase tracking-[0.18em] text-rail-muted"
            style={{ fontSize: isHero ? 11 : 9.5 }}
          >
            {week === 0 ? 'Preseason' : 'Weekly Recap'}
          </div>
          <div
            className="display leading-none text-rail-text"
            style={{ fontSize: isHero ? 64 : 40 }}
          >
            {week === 0 ? 'Kickoff' : `Week ${week}`}
          </div>
        </div>

        {/* Oversized ghost numeral, like a jersey. */}
        {week > 0 && (
          <div
            className="display leading-none text-white/8 tnum"
            style={{ fontSize: isHero ? 150 : 90, marginBottom: isHero ? -22 : -14 }}
          >
            {String(week).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  )
}

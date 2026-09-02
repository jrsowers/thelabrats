/**
 * Full-bleed hero for the draft recap.
 *
 * Full-bleed to the very top: the negative top margin cancels AppShell's
 * padding, which otherwise leaves a band of page colour above the photo.
 *
 * The photograph is a night stadium with no logo in it, so the headline has
 * somewhere to sit. A dark scrim sits between the two: the image has bright
 * floodlights in the upper corners and white text over those alone would be
 * unreadable, so the overlay is not decoration, it is what makes the type work.
 */
export function RecapHero({
  headline, standfirst,
}: { headline: string; standfirst: string }) {
  return (
    <header className="relative -mx-4 -mt-6 mb-8 overflow-hidden sm:-mx-6 lg:-mt-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/draft-hero.jpg"
        alt=""
        width={1800}
        height={771}
        loading="eager"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      {/* Two layers: a flat scrim for overall contrast, and a bottom-weighted
          gradient so the text end is darker than the floodlights. */}
      <div aria-hidden className="absolute inset-0 bg-black/55" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

      <div className="relative px-5 pb-10 pt-28 text-center sm:px-8 sm:pb-12 sm:pt-36 lg:pt-44">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
          Draft Recap · 2026
        </div>
        <h1 className="display mx-auto mt-2 max-w-3xl text-[34px] leading-[1.02] text-white sm:text-[52px] lg:text-[60px]">
          {headline}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
          {standfirst}
        </p>
      </div>
    </header>
  )
}

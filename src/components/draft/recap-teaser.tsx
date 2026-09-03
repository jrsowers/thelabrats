import Link from 'next/link'

/**
 * Front-page teaser for the recap, sitting above the pick feed.
 *
 * Same night-stadium frame as the recap's own hero, shorter, and clickable
 * end to end. The overlay is doing real work: the photo has floodlights in the
 * top corners and white type over those alone is unreadable.
 */
export function RecapTeaser({
  headline, standfirst,
}: { headline: string; standfirst: string }) {
  return (
    <Link
      href="/draft/recap"
      className="group relative mb-6 block overflow-hidden rounded-lg"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/draft-hero.jpg"
        alt=""
        width={1800}
        height={771}
        loading="eager"
        decoding="async"
        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div aria-hidden className="absolute inset-0 bg-black/60" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

      <div className="relative px-5 py-8 text-center sm:px-8 sm:py-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
          The Draft Recap
        </div>
        <h2 className="display mx-auto mt-2 max-w-2xl text-[28px] leading-[1.05] text-white sm:text-[40px]">
          {headline}
        </h2>
        <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-white/80 sm:text-[15.5px]">
          {standfirst}
        </p>
        <span className="tap-target mt-5 inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 text-[13px] font-bold uppercase tracking-wider text-brand-ink transition-opacity group-hover:opacity-90">
          CLICK TO SEE THE DAMAGE
        </span>
      </div>
    </Link>
  )
}

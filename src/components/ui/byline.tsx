import type { Author } from '@/content/author'

/**
 * Who wrote the recap.
 *
 * Three sizes, because the byline does a different job in each place:
 *
 * - `card`   closes a recap, and is the only one that carries the bio. It is
 *            also the signature — recaps end on prose and never type a sign-off,
 *            because a typed one directly above this card reads as a mistake.
 * - `inline` sits under the headline and establishes the voice before the first
 *            joke. Deliberately large: the correspondent is half the reason the
 *            page exists, and at 34px he was a footnote.
 * - `compact` rides on every archive card, so the author is attached to the
 *            work everywhere it appears rather than only once you open it. It
 *            is the smallest of the three and still deliberately not small —
 *            a 30px face in a grid of cards is a favicon, not a byline.
 */
const SIZES = {
  compact: { avatar: 42, name: 15.5, title: 10, gap: 'gap-2.5' },
  inline: { avatar: 54, name: 20, title: 11, gap: 'gap-3.5' },
  card: { avatar: 64, name: 21, title: 11, gap: 'gap-4' },
} as const

export function Byline({
  author, variant = 'inline',
}: { author: Author; variant?: keyof typeof SIZES }) {
  const isCard = variant === 'card'
  const s = SIZES[variant]

  return (
    <div
      className={
        isCard
          ? `mt-10 flex items-start ${s.gap} rounded-lg border border-border bg-surface p-4 sm:p-5`
          : `flex items-center ${s.gap}`
      }
    >
      {/* Plain <img>: a fixed-size local JPEG that next/image would only add a
          loader to. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={author.avatar}
        alt=""
        width={s.avatar}
        height={s.avatar}
        className="shrink-0 rounded-full border border-border object-cover"
        style={{ width: s.avatar, height: s.avatar }}
      />
      <div className="min-w-0">
        <div className="display leading-tight" style={{ fontSize: s.name }}>
          {author.name}
        </div>
        <div
          className="font-mono uppercase tracking-wider text-dim"
          style={{ fontSize: s.title }}
        >
          {author.title}
        </div>
        {isCard && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{author.bio}</p>
        )}
      </div>
    </div>
  )
}

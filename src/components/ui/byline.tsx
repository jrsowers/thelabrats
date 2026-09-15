import type { Author } from '@/content/author'

/**
 * Who wrote the recap, in two sizes.
 *
 * `inline` sits under the headline; `card` closes the piece. Both exist
 * because a byline at the top establishes the voice before the first joke, and
 * a card at the bottom is where the reader is when they want to know who that
 * was.
 */
export function Byline({
  author, date, variant = 'inline',
}: { author: Author; date?: string; variant?: 'inline' | 'card' }) {
  const isCard = variant === 'card'
  const size = isCard ? 52 : 34

  return (
    <div
      className={
        isCard
          ? 'mt-10 flex items-start gap-4 rounded-lg border border-border bg-surface p-4 sm:p-5'
          : 'flex items-center gap-2.5'
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={author.avatar}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
      <div className="min-w-0">
        <div className={`display leading-tight ${isCard ? 'text-[18px]' : 'text-[14.5px]'}`}>
          {author.name}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-dim">
          {author.title}
          {date && !isCard && <span className="normal-case tracking-normal"> · {date}</span>}
        </div>
        {isCard && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{author.bio}</p>
        )}
      </div>
    </div>
  )
}

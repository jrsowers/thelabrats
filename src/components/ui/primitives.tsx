/**
 * Core visual vocabulary. Every screen is assembled from these.
 * See AI-References/STYLE-GUIDE.md before adding to this file.
 */
import type { ReactNode } from 'react'

/* ---------- Eyebrow: the specimen tag ---------- */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>
}

/* ---------- Section header ---------- */
export function SectionHeader({
  eyebrow, title, action,
}: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 border-b border-border pb-2">
      <div>
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <h2 className="display text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

/* ---------- Tag: category / status pill ---------- */
type Tone = 'neutral' | 'brand' | 'live' | 'win' | 'loss' | 'warn'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  brand: 'bg-brand-soft text-brand border-brand/25',
  live: 'bg-live-soft text-live border-live/30',
  win: 'bg-live-soft text-win border-live/30',
  loss: 'bg-loss-soft text-loss border-loss/30',
  warn: 'bg-warn-soft text-warn border-warn/30',
}

export function Tag({
  children, tone = 'neutral',
}: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${TONE[tone]}`}
    >
      {children}
    </span>
  )
}

/* ---------- Live indicator ----------
   Dot + word. Never color alone (§39). */
export function LiveBadge({ label = 'Live' }: { label?: string }) {
  return (
    <Tag tone="live">
      <span className="live-dot inline-block size-1.5 rounded-full bg-live" aria-hidden />
      {label}
    </Tag>
  )
}

/* ---------- Stat tile ---------- */
export function StatTile({
  label, value, sub, tone,
}: { label: string; value: string; sub?: string; tone?: 'brand' | 'live' | 'loss' }) {
  const color =
    tone === 'brand' ? 'text-brand' : tone === 'live' ? 'text-live' : tone === 'loss' ? 'text-loss' : ''
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
      <Eyebrow>{label}</Eyebrow>
      <div className={`display mt-1.5 text-[26px] tnum ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

/* ---------- Card ---------- */
export function Card({
  children, className = '', flush = false,
}: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${flush ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  )
}

/* ---------- Skeleton ----------
   Never blank a live scoreboard to refresh it (§37). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-2 ${className}`} aria-hidden />
}

/* ---------- Bracket icon ----------
   A three-round playoff bracket: four seeds into two, two into one. Drawn
   rather than borrowed — Lucide has no equivalent, and a merge or network
   glyph reads as the wrong concept. Used everywhere "playoffs" is meant, so
   the nav and the scoreboard shortcut are the same mark. */
export function BracketIcon({
  size = 16,
  className,
}: { size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Round 1: four seeds */}
      <path d="M2 3.5h4M2 9.5h4M2 14.5h4M2 20.5h4" />
      {/* Round 1 -> 2: pair them */}
      <path d="M6 3.5v6M6 14.5v6" />
      {/* Round 2: two semifinals */}
      <path d="M6 6.5h5M6 17.5h5" />
      {/* Round 2 -> 3 */}
      <path d="M11 6.5v11" />
      {/* Final */}
      <path d="M11 12h5" />
      <rect x="16" y="10.4" width="6" height="3.2" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ---------- Team avatar ----------
   Identity, in order of preference: the member's own photo, then the ESPN team
   logo, then a mono abbreviation chip. A real face beats a stock helmet.

   The reigning champion gets a crown. It lives here rather than in the
   scoreboard so every future surface — standings, awards, record books — picks
   it up for free instead of reimplementing it. */
export function TeamAvatar({
  photoUrl, logoUrl, abbrev, size = 36, champion = false, championYear,
}: {
  photoUrl?: string | null
  logoUrl?: string | null
  abbrev?: string | null
  size?: number
  champion?: boolean
  championYear?: number | null
}) {
  const src = photoUrl ?? logoUrl
  const isPhoto = Boolean(photoUrl)
  const label = championYear ? `Reigning champion, ${championYear}` : 'Reigning champion'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // Plain <img>: ESPN logos are remote SVGs and next/image would need
        // dangerouslyAllowSVG. Eager because these sit at the top of the page
        // and all twelve together are ~223KB.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          className={`size-full border object-cover ${isPhoto ? 'rounded-full' : 'rounded-md'} ${
            champion ? 'border-warn/70' : 'border-border'
          } bg-surface-2`}
        />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-[10px] font-bold text-muted"
        >
          {abbrev ?? '—'}
        </div>
      )}

      {champion && (
        <span
          title={label}
          aria-label={label}
          role="img"
          className="absolute -right-1 -top-1.5 flex items-center justify-center rounded-full bg-warn text-[#1a1205] shadow-sm ring-2 ring-surface"
          style={{ width: size * 0.5, height: size * 0.5 }}
        >
          {/* Crown, drawn small enough to stay legible at 16px. */}
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '72%', height: '72%' }} aria-hidden>
            <path d="M3 7.5l3.6 3L12 4l5.4 6.5 3.6-3-1.8 10.2H4.8L3 7.5zM4.9 19.8h14.2v1.7H4.9v-1.7z" />
          </svg>
        </span>
      )}
    </div>
  )
}

/* ---------- The seal ----------
   Creator Science's circular badge, recast as lab glassware. */
export function LabSeal({ size = 88 }: { size?: number }) {
  const id = 'seal-path'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="The Lab Rats">
      <defs>
        <path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--brand)" strokeWidth="1" opacity="0.45" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="var(--brand)" strokeWidth="1" opacity="0.3" />
      <text fill="var(--brand)" fontSize="8.2" fontFamily="var(--font-mono), monospace" fontWeight="600" letterSpacing="2.4">
        <textPath href={`#${id}`} startOffset="0%">
          THE LAB RATS · FANTASY FOOTBALL · EST 2025 ·
        </textPath>
      </text>
      {/* Flask */}
      <g stroke="var(--brand)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 36 L44 47 L36 62 A3 3 0 0 0 39 66 L61 66 A3 3 0 0 0 64 62 L56 47 L56 36" />
        <path d="M41.5 36 L58.5 36" />
        <path d="M39.6 56 L60.4 56" opacity="0.55" />
      </g>
      <circle cx="46" cy="60" r="1.6" fill="var(--brand)" opacity="0.8" />
      <circle cx="53" cy="61.5" r="1.1" fill="var(--brand)" opacity="0.6" />
    </svg>
  )
}

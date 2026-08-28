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
   Mirrors ESPN's playoff-bracket mark: two seeds on the left joined by a
   bracket into one on the right. Lucide has no close equivalent, so it is
   drawn here rather than approximated with a merge or network glyph. */
export function BracketIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="4.25" width="6" height="3.5" rx="1" fill="currentColor" stroke="none" />
      <rect x="2" y="16.25" width="6" height="3.5" rx="1" fill="currentColor" stroke="none" />
      <rect x="15" y="10.25" width="7" height="3.5" rx="1" fill="currentColor" stroke="none" />
      <path d="M8 6H11V18H8" />
      <path d="M11 12H15" />
    </svg>
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

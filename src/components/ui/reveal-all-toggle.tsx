'use client'

/**
 * Page-level escape hatch for the reveal cards.
 *
 * The reveal is fun once. It is tedious on the fourth visit, and it is a wall
 * for anyone who reads with a screen magnifier or simply wants to scan. One
 * switch turns the whole page plain.
 */
export function RevealAllToggle({
  revealAll, onChange,
}: { revealAll: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={revealAll}
      onClick={() => onChange(!revealAll)}
      className="tap-target flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-muted transition-colors hover:border-border-strong hover:text-text"
    >
      <span
        aria-hidden
        className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${
          revealAll ? 'bg-brand' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-0.5 size-2.5 rounded-full bg-surface transition-[left] duration-200 motion-reduce:transition-none ${
            revealAll ? 'left-3' : 'left-0.5'
          }`}
        />
      </span>
      Reveal all
    </button>
  )
}

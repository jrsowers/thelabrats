/**
 * Football field behind page headers: yard lines, hash marks, and yard numbers.
 *
 * Lines are CSS gradients (they tile cleanly at any width). Numbers are real
 * elements positioned on the 10-yard lines, because a gradient cannot draw a 40.
 *
 * Tuning notes live in AI-References/STYLE-GUIDE.md.
 */

/** 10-yard spacing, matching --field-major in globals.css. */
const YARD_10 = 112

/** A real field's numbers: up to the 50, then back down. Repeats to fill width. */
const SEQUENCE = [10, 20, 30, 40, 50, 40, 30, 20, 10]

export function FieldBackdrop({ count = 18 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="field-lines absolute inset-0" />
      <div className="field-numbers absolute inset-x-0 bottom-5 h-[1em]">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="display absolute -translate-x-1/2 text-[15px] leading-none"
            style={{ left: `${(i + 1) * YARD_10}px` }}
          >
            {SEQUENCE[i % SEQUENCE.length]}
          </span>
        ))}
      </div>
    </div>
  )
}

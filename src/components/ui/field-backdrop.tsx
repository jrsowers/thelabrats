/**
 * Football field behind page headers: yard lines, hash marks, and yard numbers.
 *
 * Lines are CSS gradients sized in percentages, so exactly one 100-yard field
 * spans the header at any width. Numbers are real elements — a gradient cannot
 * draw a 40 — positioned on the 10-yard marks at 10% intervals, which is why
 * they stay aligned with the lines.
 *
 * Tuning notes live in AI-References/STYLE-GUIDE.md.
 */

/**
 * One field, end to end: 10 through the 50 and back down. Exactly nine numbers,
 * on the 10 through 90 yard lines. Not a repeating pattern — an earlier version
 * tiled this and produced a tenth number, so the field read as 1½ fields.
 */
const YARD_NUMBERS = [10, 20, 30, 40, 50, 40, 30, 20, 10]

export function FieldBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="field-lines absolute inset-0" />
      <div className="field-numbers absolute inset-x-0 bottom-6 h-[28px]">
        {YARD_NUMBERS.map((n, i) => (
          <span
            key={i}
            className="display absolute bottom-0 -translate-x-1/2 text-[27px] leading-none"
            style={{ left: `${(i + 1) * 10}%` }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

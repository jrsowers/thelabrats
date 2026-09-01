/**
 * The grade. It is always an F, on every card, for everyone.
 *
 * Rendered as a stamp rather than text because the joke only works if it looks
 * institutional — a verdict that was decided before anyone read the analysis.
 */
export function GradeStamp({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-[38px]' : size === 'sm' ? 'h-9 w-9 text-[20px]' : 'h-12 w-12 text-[28px]'
  return (
    <span
      aria-label={`Grade: ${grade}`}
      className={`display ${dim} inline-flex shrink-0 items-center justify-center rounded-md border-2 border-loss text-loss`}
      style={{ lineHeight: 1 }}
    >
      {grade}
    </span>
  )
}

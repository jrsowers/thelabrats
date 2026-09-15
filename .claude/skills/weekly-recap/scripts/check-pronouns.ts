/**
 * Flags gendered pronouns sitting near a manager's name in a recap.
 *
 *   npx tsx .claude/skills/weekly-recap/scripts/check-pronouns.ts [week]
 *
 * ⚠️ THIS IS A REVIEW AID, NOT A GATE, AND THAT IS DELIBERATE.
 *
 * The awards engine has a real test for this (tests/awards.test.ts) because its
 * copy is generated from templates — the same sentence every week, so a rule
 * can be exact. Recap prose cannot be checked that way: "Colin then benched
 * him" is correct, because `him` is Stefon Diggs. Any pattern strict enough to
 * catch every violation also fires on legitimate sentences about NFL players,
 * and a noisy gate gets ignored, which is worse than no gate.
 *
 * So this prints candidates and a person reads them. On the first run against
 * week 1 it surfaced four lines, two of which were real violations that had
 * already been written. That hit rate is excellent for a review pass and
 * unacceptable for CI.
 */
import { RECAPS, type RecapBlock } from '../../../../src/content/recaps'

const MANAGERS = [
  'Chenell', 'Tyler', 'Keshia', 'Bree', 'Doug', 'Justin',
  'Colin', 'Evan', 'Mike', 'James', 'Jay', 'Jesse',
]
const GENDERED = /\b(he|him|his|she|her|hers)\b/i

const blockText = (b: RecapBlock): string =>
  b.type === 'stat' ? `${b.label} ${b.value} ${b.note ?? ''}` : b.text

const week = process.argv[2] ? Number(process.argv[2]) : null
let hits = 0

for (const r of RECAPS) {
  if (week != null && r.week !== week) continue
  const lines = [r.title, r.summary, ...r.body.map(blockText)]
    .flatMap((t) => t.split(/(?<=[.!?])\s+/))

  for (const line of lines) {
    if (!GENDERED.test(line)) continue
    const named = MANAGERS.filter((m) => line.includes(m))
    if (named.length === 0) continue
    hits += 1
    console.log(`\n  week ${r.week} · near ${named.join(', ')}`)
    console.log(`  ${line}`)
  }
}

console.log(
  hits === 0
    ? '\nNo candidates. Nothing to review.'
    : `\n${hits} candidate${hits === 1 ? '' : 's'}. For each: does the pronoun refer to a ` +
      'MANAGER (rewrite — they/them, or repeat the name) or to an NFL PLAYER (fine, leave it)?',
)

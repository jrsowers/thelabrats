/**
 * What the season already said. Run BEFORE writing a recap.
 *
 *   npx tsx .claude/skills/fantasy-weekly-recap/scripts/recall.ts <week>
 *
 * A weekly column that cannot remember last week is twelve disconnected blog
 * posts. The running joke, the prediction that aged badly, the manager who has
 * not been mentioned since September — that continuity is most of what makes a
 * column feel like a column, and none of it survives a fresh context window.
 *
 * So it is computed instead of remembered. Four sections, three of which caught
 * something real the first time they ran.
 */
import { RECAPS, type RecapBlock } from '../../../../src/content/recaps'

const WEEK = Number(process.argv[2] ?? 99)

const MANAGERS = [
  'Chenell', 'Tyler', 'Keshia', 'Bree', 'Doug', 'Justin',
  'Colin', 'Evan', 'Mike', 'James', 'Jay', 'Jesse',
]

const blockText = (b: RecapBlock): string => {
  switch (b.type) {
    case 'stat': return `${b.label} ${b.value} ${b.note ?? ''}`
    case 'scoreboard': return b.rows.map((r) => `${r.winner} ${r.loser}`).join(' ')
    case 'paragraph':
    case 'heading':
    case 'quote': return b.text
    default: {
      const _exhaustive: never = b
      return _exhaustive
    }
  }
}

const STOP = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'is', 'was', 'it', 'that',
  'this', 'for', 'with', 'at', 'by', 'from', 'as', 'his', 'her', 'their', 'they',
  'he', 'she', 'you', 'i', 'not', 'but', 'had', 'has', 'have', 'been', 'be',
  'are', 'were', 'one', 'two', 'all', 'who', 'what', 'which', 'week', 'points',
  'league', 'season', 'game', 'still', 'own', 'into', 'out', 'up', 'down',
])
/** Every 2- and 3-word phrase carrying at least two content words. */
function grams(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  const out: string[] = []
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const gram = words.slice(i, i + n)
      // Two content words minimum, or it is grammar rather than imagery.
      if (gram.filter((w) => !STOP.has(w) && w.length > 3).length < 2) continue
      out.push(gram.join(' '))
    }
  }
  return out
}

// ------------------------------------------- 3b. repeats inside this week
// The cross-week scan above would NOT have caught the thing that prompted all
// of this: week 1 reached for the same bench metaphor three times inside two
// paragraphs. That is a repeat within one piece, and it needs its own pass.
// Run this again once the draft is in recaps.ts.
const thisWeek = RECAPS.find((r) => r.week === WEEK)
if (thisWeek) {
  console.log(`\n═══ REPEATS INSIDE WEEK ${WEEK} ═══\n`)
  const seen = new Map<string, number>()
  for (const key of grams(textOf(thisWeek))) seen.set(key, (seen.get(key) ?? 0) + 1)
  const dupes = [...seen.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
  if (dupes.length === 0) {
    console.log('  (no phrase used twice)')
  } else {
    for (const [phrase, n] of dupes) console.log(`  ${n}\u00d7  "${phrase}"`)
    console.log('\n  Inside a single recap, twice is almost always one too many.')
  }
}

const prior = RECAPS
  .filter((r) => r.published && r.week < WEEK && r.week > 0)
  .sort((a, b) => a.week - b.week)

if (prior.length === 0) {
  console.log(`\nNothing published before week ${WEEK} — no continuity to honour yet.\n`)
  process.exit(0)
}

// A declaration, not a const arrow: the within-week scan runs above this point
// and needs it hoisted.
function textOf(r: (typeof RECAPS)[number]): string {
  return [r.title, r.summary, ...r.body.map(blockText)].join('\n')
}

// ---------------------------------------------------------------- 1. the bill
// Every call Burner has made and not yet settled. The voice spec has him loudly
// wrong about the future and owning it the following week; that only works if
// somebody presents the invoice.
console.log('\n═══ OPEN PREDICTIONS — settle or explicitly carry each one ═══\n')
const open = prior.flatMap((r) =>
  (r.predictions ?? []).filter((p) => !p.verdict).map((p) => ({ ...p, week: r.week })),
)
if (open.length === 0) {
  console.log('  (none outstanding)')
} else {
  for (const p of open) {
    console.log(`  [week ${p.week}] ${p.id}`)
    console.log(`     "${p.claim}"\n`)
  }
  console.log('  Check each against this week\'s results. If settled, set `verdict`,')
  console.log('  `resolvedWeek` and `resolution` on it in src/content/recaps.ts AND')
  console.log('  say so in the recap — taking the loss out loud is the whole bit.')
}

const settled = prior.flatMap((r) =>
  (r.predictions ?? []).filter((p) => p.verdict).map((p) => ({ ...p, week: r.week })),
)
if (settled.length > 0) {
  console.log('\n─── already settled (callback material, do not re-litigate) ───\n')
  for (const p of settled) {
    console.log(`  [week ${p.week} → ${p.resolvedWeek}] ${p.verdict!.toUpperCase()}: "${p.claim}"`)
  }
}

// ------------------------------------------------------- 2. who has had a turn
// The skill says every manager should appear across a season, not every week —
// being ignored stings worse than being roasted. That is impossible to track by
// feel past about week three.
console.log('\n═══ WHO HAS BEEN NAMED ═══\n')
const counts = new Map<string, number[]>(MANAGERS.map((m) => [m, []]))
for (const r of prior) {
  const t = textOf(r)
  for (const m of MANAGERS) {
    const n = (t.match(new RegExp(`\\b${m}\\b`, 'g')) ?? []).length
    if (n > 0) counts.get(m)!.push(r.week)
  }
}
const lastWeek = prior[prior.length - 1].week
const ranked = [...counts.entries()].sort((a, b) => a[1].length - b[1].length)
for (const [m, weeks] of ranked) {
  const since = weeks.length === 0 ? '—' : `w${weeks[weeks.length - 1]}`
  const stale = weeks.length === 0 || lastWeek - weeks[weeks.length - 1] >= 2
  console.log(
    `  ${m.padEnd(9)} ${String(weeks.length).padStart(2)} recap(s), last ${since}` +
      (stale ? '   ← OVERDUE' : ''),
  )
}

// ------------------------------------------------ 3. phrases already spent
// The folding-chair detector. Week 1 used the same bench metaphor three times
// in two paragraphs and nobody noticed until a reader did. A running bit is an
// asset; the same image twice in one piece is a tic.
console.log('\n═══ IMAGERY ALREADY SPENT — do not reach for these again ═══\n')
const phrases = new Map<string, Set<number>>()
for (const r of prior) {
  for (const key of grams(textOf(r))) {
    if (!phrases.has(key)) phrases.set(key, new Set())
    phrases.get(key)!.add(r.week)
  }
}
const repeated = [...phrases.entries()]
  .filter(([, weeks]) => weeks.size >= 2)
  .sort((a, b) => b[1].size - a[1].size || b[0].length - a[0].length)
  .slice(0, 25)
if (repeated.length === 0) {
  console.log('  (nothing reused across weeks yet)')
} else {
  for (const [phrase, weeks] of repeated) {
    console.log(`  "${phrase}"  —  weeks ${[...weeks].sort((a, b) => a - b).join(', ')}`)
  }
  console.log('\n  Deliberate running bits are an asset. Accidental repeats are a tic.')
  console.log('  Decide which each one is.')
}

// -------------------------------------------------------- 4. the story so far
console.log('\n═══ THE STORY SO FAR ═══\n')
for (const r of prior) {
  console.log(`  WEEK ${r.week} — ${r.title}`)
  console.log(`    ${r.summary}`)
  for (const b of r.body) {
    if (b.type === 'heading' && !/^[A-Z0-9 ,.'’—-]+$/.test(b.text)) {
      console.log(`      · ${b.text}`)
    }
  }
  console.log()
}

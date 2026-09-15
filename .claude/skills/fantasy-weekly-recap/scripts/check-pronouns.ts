/**
 * Flags pronouns near a manager's name that do not match that manager's own.
 *
 *   npx tsx .claude/skills/fantasy-weekly-recap/scripts/check-pronouns.ts [week]
 *
 * The original version flagged *every* gendered pronoun near a manager, because
 * the league's pronouns were unknown and they/them was the safe default. James
 * supplied the real list on 2026-09-15 (`src/content/managers.ts`), so this now
 * asks a much sharper question: is this the RIGHT pronoun for the person named?
 *
 * A "she" in a sentence about Colin is a genuine bug. A "he" in a sentence about
 * Chenell is usually an NFL player — the player pool is all men — but it is
 * exactly the sentence worth reading twice, so it still prints, marked.
 *
 * ⚠️ STILL A REVIEW AID, NOT A GATE. "Colin then benched him" is correct, because
 * `him` is Stefon Diggs. No pattern can separate that from a real mistake
 * without understanding the sentence, and a noisy gate gets ignored — which is
 * worse than no gate.
 */
import { RECAPS, type RecapBlock } from '../../../../src/content/recaps'
import {
  MANAGER_FIRST_NAMES, pronounsFor, hasKnownPronouns,
} from '../../../../src/content/managers'

const GENDERED = /\b(he|him|his|she|her|hers|they|them|their)\b/gi

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

const week = process.argv[2] ? Number(process.argv[2]) : null
let wrong = 0
let review = 0

for (const r of RECAPS) {
  if (week != null && r.week !== week) continue
  const lines = [r.title, r.summary, ...r.body.map(blockText)]
    .flatMap((t) => t.split(/(?<=[.!?])\s+/))

  for (const line of lines) {
    const named = MANAGER_FIRST_NAMES.filter((m) => new RegExp(`\\b${m}\\b`).test(line))
    if (named.length === 0) continue

    const found = [...new Set((line.match(GENDERED) ?? []).map((w) => w.toLowerCase()))]
    if (found.length === 0) continue

    // Every pronoun any named manager in this sentence could legitimately take.
    const allowed = new Set(
      named.filter(hasKnownPronouns).flatMap((m) => {
        const p = pronounsFor(m)
        return [p.subject, p.object, p.possessive, p.possessivePronoun, p.reflexive]
      }),
    )
    const mismatched = found.filter((w) => !allowed.has(w))
    if (mismatched.length === 0) continue

    // Three very different situations, and lumping them together made the
    // first run cry wolf on three correct sentences out of four.
    //
    //   she/her near a he/him-only sentence  → almost certainly a real bug;
    //        nothing else in the sentence can be taking it.
    //   he/him near a she/her-only sentence  → usually an NFL player, since the
    //        player pool is all men. Worth a glance, rarely wrong.
    //   they/them/their                      → not a bug at all. Legitimately
    //        plural ("both of them belong to Chenell") or generic ("follows a
    //        person to their funeral") — but ALSO how the old neutral-default
    //        copy reads, so it is the category actually worth revisiting now
    //        that real pronouns exist.
    const NEUTRAL = new Set(['they', 'them', 'their'])
    const MASC = new Set(['he', 'him', 'his'])
    const neutral = mismatched.filter((w) => NEUTRAL.has(w))
    const gendered = mismatched.filter((w) => !NEUTRAL.has(w))
    const likelyBug = gendered.some((w) => !MASC.has(w))

    let tag: string
    if (likelyBug) { tag = '‼ WRONG PRONOUN'; wrong += 1 }
    else if (gendered.length > 0) { tag = '· probably a player'; review += 1 }
    else { tag = '○ neutral — can it be specific now?'; review += 1 }

    console.log(`\n  ${tag}  week ${r.week} · names ${named.join(', ')}`)
    console.log(`     unmatched: ${(likelyBug || gendered.length ? gendered : neutral).join(', ')}`)
    console.log(`     ${line}`)
  }
}

console.log(
  wrong === 0 && review === 0
    ? '\nEvery pronoun near a manager matches that manager. Nothing to review.\n'
    : `\n${wrong} wrong, ${review} to eyeball. A pronoun about a MANAGER must match ` +
      'src/content/managers.ts; one about an NFL PLAYER is fine as-is. Neutral\n' +
      'phrasing is not an error, but it is often a leftover from when the ' +
      'pronouns\nwere unknown — and it usually reads better made specific.\n',
)

/**
 * Burner declines to discuss an injury in a different way every time.
 *
 * The roast boundary — injuries reported flat, never made funny — is not what
 * broke. The sentence enforcing it did. Five posts in six weeks carried the
 * same construction and two were word for word identical, which turned a rule
 * into a verbal tic.
 *
 * A note in voice.md saying "vary it" is exactly the kind of instruction this
 * project has watched fail four separate times. So it is a test.
 */
import { describe, it, expect } from 'vitest'
import { RECAPS } from '@/content/recaps'
import {
  MEDICAL_DISCLAIMERS, RETIRED_DISCLAIMER_PATTERNS,
} from '@/content/medical-disclaimers'

/** Every paragraph of every published post, with the post it came from. */
const paragraphs = RECAPS
  .filter((r) => r.published)
  .flatMap((r) => r.body
    .filter((b): b is { type: 'paragraph'; text: string } => b.type === 'paragraph')
    .map((b) => ({ slug: r.slug, week: r.week, text: b.text })))

/** Normalized for comparison — curly quotes and case should not hide a repeat. */
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()

describe('the retired phrasing stays retired', () => {
  it('never appears in a published post', () => {
    const hits = paragraphs.flatMap((p) =>
      RETIRED_DISCLAIMER_PATTERNS
        .filter((re) => re.test(p.text))
        .map((re) => `${p.slug}: ${re} — "${p.text.slice(0, 90)}…"`))
    expect(hits, `retired medical-disclaimer phrasing:\n${hits.join('\n')}`).toEqual([])
  })
})

describe('disclaimers rotate', () => {
  // Matched by FINGERPRINT, not by the whole sentence. Every published use was
  // reworded at the join to fit its paragraph, and a substring check caught
  // two of five.
  const used = paragraphs.flatMap((p) =>
    MEDICAL_DISCLAIMERS
      .filter((d) => d.fingerprint.test(p.text))
      .map((d) => ({ ...p, disclaimer: d.id })))

  it('finds the disclaimers that are actually published', () => {
    // Guards the guard: if the fingerprints stop matching, every test below
    // passes vacuously and the control is gone.
    expect(used.length).toBeGreaterThan(0)
  })

  it('uses each one at most once across the whole season', () => {
    const seen = new Map<string, string[]>()
    for (const u of used) {
      seen.set(u.disclaimer, [...(seen.get(u.disclaimer) ?? []), u.slug])
    }
    const repeated = [...seen.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([d, slugs]) => `${d} in ${slugs.join(', ')}`)
    expect(repeated, `a medical disclaimer was reused:\n${repeated.join('\n')}`).toEqual([])
  })

  it('uses at most one per post', () => {
    const perPost = new Map<string, number>()
    for (const u of used) perPost.set(u.slug, (perPost.get(u.slug) ?? 0) + 1)
    const doubled = [...perPost.entries()].filter(([, n]) => n > 1).map(([s, n]) => `${s}: ${n}`)
    expect(doubled, `more than one disclaimer in a post:\n${doubled.join('\n')}`).toEqual([])
  })

  it('leaves enough unused lines for the rest of the season', () => {
    // Fourteen regular-season weeks plus Monday posts. Running out mid-season
    // is how a writer ends up reusing one.
    const remaining = MEDICAL_DISCLAIMERS.length - new Set(used.map((u) => u.disclaimer)).size
    expect(remaining, 'the disclaimer bank is nearly exhausted — add more to '
      + 'src/content/medical-disclaimers.ts').toBeGreaterThan(2)
  })
})

describe('the bank itself', () => {
  it('has no duplicate lines or ids', () => {
    expect(new Set(MEDICAL_DISCLAIMERS.map((d) => norm(d.line))).size)
      .toBe(MEDICAL_DISCLAIMERS.length)
    expect(new Set(MEDICAL_DISCLAIMERS.map((d) => d.id)).size)
      .toBe(MEDICAL_DISCLAIMERS.length)
  })

  it('gives every line a fingerprint that matches it and nothing else', () => {
    for (const d of MEDICAL_DISCLAIMERS) {
      expect(d.fingerprint.test(d.line), `${d.id} does not match its own fingerprint`).toBe(true)
      const others = MEDICAL_DISCLAIMERS.filter((o) => o.id !== d.id && d.fingerprint.test(o.line))
      expect(others.map((o) => o.id), `${d.id}'s fingerprint also matches`).toEqual([])
    }
  })

  it('never jokes about the injury, only about Burner', () => {
    // The disclaimer exists to protect the player. A line that reaches for the
    // body, the timetable or the absence defeats its own purpose.
    const banned = /\b(injur|hurt|broken|torn|concuss|surgery|timetable|limp|crutch|hospital|blood|knee|ankle|shoulder|elbow)\w*/i
    for (const d of MEDICAL_DISCLAIMERS) {
      expect(d.line, `disclaimer reaches for the injury: ${d.id}`).not.toMatch(banned)
    }
  })

  it('is written in the first person, because the joke is on the narrator', () => {
    for (const d of MEDICAL_DISCLAIMERS) {
      expect(d.line, `disclaimer is not about Burner: ${d.id}`).toMatch(/\b(i|my|me)\b/i)
    }
  })

  it('writes American English', () => {
    const banned = /\b(licence|practise|favour|colour|defence|whilst|realise|organised|grey)\b/i
    for (const d of MEDICAL_DISCLAIMERS) expect(d.line, d.id).not.toMatch(banned)
  })
})

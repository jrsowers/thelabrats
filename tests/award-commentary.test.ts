/**
 * Award commentary: variety, determinism, and the claims it is allowed to make.
 *
 * The complaint these exist for: *"It seems like you're using the exact same
 * words, but swapping in new manager/player awards and point totals."* Every
 * award used to own exactly one sentence, so the cards repeated all season.
 * A test is the only thing that keeps the next award honest about it.
 */
import { describe, it, expect } from 'vitest'
import {
  buildCommentary, commentaryVariants, variantIndex,
  COMMENTARY_KEYS, firstName,
  type CommentaryContext,
} from '@/lib/awards/commentary'
import { AWARDS } from '@/lib/awards/catalog'

/** Minimum phrasings an award must own. Five weeks clear before a repeat. */
const MIN_VARIANTS = 5

const ctx = (over: Partial<CommentaryContext> = {}): CommentaryContext => ({
  managerFirst: 'Chenell',
  teamName: 'Da Reigning Champ',
  opponentTeam: 'Mr. Anderson',
  opponentManager: 'Jesse Anderson',
  playerName: 'Derrick Henry',
  playerMeta: 'RB · BAL',
  value: '41.2',
  week: 1,
  ...over,
})

/**
 * Every branch a builder can take, as the `extra` that selects it. A builder
 * with conditional copy must be varied down EVERY path, not just the common
 * one — the branch nobody tests is the branch that repeats all season.
 */
const BRANCHES: Record<string, Partial<CommentaryContext>[]> = {
  mastermind: [{ value: '0' }, { value: '4.80' }],
  waiver_wire_wizard: [
    { extra: { Lineup: 'Benched' } },
    { extra: { Lineup: 'Started' } },
  ],
  nostradamus: [
    { extra: { Projected: '11.2', Actual: '32.6' } },
    { extra: {} },
  ],
  control_group: [
    { extra: { Projected: '118.4', Scored: '121.0' } },
    { extra: {} },
  ],
  sweatin_it_out: [
    { extra: { when: 'going into Monday night' } },
    { extra: {} },
  ],
  bench_bum: [
    { extra: { verdict: 'league-best' } },
    { extra: { verdict: 'won' } },
    { extra: {} },
  ],
  free_fall: [
    { extra: { 'Starting rank': '4th', 'Ending rank': '9th' } },
    { extra: {} },
  ],
}

const branchesFor = (key: string) => BRANCHES[key] ?? [{}]

const text = (key: string, over: Partial<CommentaryContext> = {}) =>
  buildCommentary(key, ctx(over)).map((s) => s.text).join('')

describe('variety', () => {
  it(`gives every award at least ${MIN_VARIANTS} phrasings, on every branch`, () => {
    for (const key of COMMENTARY_KEYS) {
      for (const [i, branch] of branchesFor(key).entries()) {
        const seen = new Set(
          commentaryVariants(key, ctx(branch), MIN_VARIANTS * 3),
        )
        expect(
          seen.size,
          `${key} (branch ${i}) produced ${seen.size} distinct phrasings`,
        ).toBeGreaterThanOrEqual(MIN_VARIANTS)
      }
    }
  })

  it('never repeats a phrasing in consecutive weeks', () => {
    // The actual complaint. Week N and week N+1 must not read the same, for
    // every award, on every branch, anywhere in a season.
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        const weeks = commentaryVariants(key, ctx(branch), 18)
        for (let i = 1; i < weeks.length; i++) {
          expect(weeks[i], `${key} repeated itself in week ${i + 1}`)
            .not.toBe(weeks[i - 1])
        }
      }
    }
  })

  it('cycles through every phrasing before reusing one', () => {
    // Guarantees the rotation is a cycle rather than a coin flip: five
    // phrasings means five clear weeks, not "probably different".
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        const weeks = commentaryVariants(key, ctx(branch), 40)
        const distinct = new Set(weeks).size
        const window = weeks.slice(0, distinct)
        expect(new Set(window).size, `${key} repeated inside one cycle`)
          .toBe(distinct)
      }
    }
  })

  it('does not open every award on the same variant in week 1', () => {
    // Mixing the key into the index is what staggers the board. Without it
    // every card sits on its first phrasing in week 1 and moves in lockstep.
    const offsets = COMMENTARY_KEYS.map((k) => variantIndex(k, 1, 5))
    expect(new Set(offsets).size).toBeGreaterThan(1)
  })
})

describe('determinism', () => {
  // Commentary is built at render time, not stored. A random pick would
  // rewrite a published card on every page load.
  it('returns the same text for the same award and week, every time', () => {
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        const once = text(key, { ...branch, week: 7 })
        for (let i = 0; i < 5; i++) {
          expect(text(key, { ...branch, week: 7 })).toBe(once)
        }
      }
    }
  })

  it('handles week 0 and a missing week without throwing', () => {
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        expect(text(key, { ...branch, week: 0 })).toBeTruthy()
        expect(text(key, { ...branch, week: undefined })).toBeTruthy()
      }
    }
  })

  it('keeps the index inside the array, for any week', () => {
    for (const week of [0, 1, 17, 999, -3, 2.7]) {
      for (const count of [1, 2, 5, 7]) {
        const i = variantIndex('cat_burglar', week, count)
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(count)
        expect(Number.isInteger(i)).toBe(true)
      }
    }
  })
})

describe('coverage', () => {
  it('has commentary for every award in the catalog', () => {
    const missing = AWARDS.map((a) => a.key).filter((k) => !COMMENTARY_KEYS.includes(k))
    expect(missing).toEqual([])
  })

  it('names the manager and the number in every phrasing', () => {
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        for (let week = 1; week <= 10; week++) {
          const segs = buildCommentary(key, ctx({ ...branch, week }))
          const all = segs.map((s) => s.text).join('')
          expect(all, `${key} week ${week} lost the manager`).toContain('Chenell')
          expect(
            segs.some((s) => s.bold),
            `${key} week ${week} has nothing in bold`,
          ).toBe(true)
        }
      }
    }
  })
})

describe('the claims the copy is allowed to make', () => {
  it('uses the recipient’s own pronouns, never a hardcoded one', () => {
    // "of exactly what he was projected to score" once shipped under Bree
    // Noble's name.
    //
    // A blunt "no he/his/him" rule would be wrong here: the NFL player pool is
    // all men, so "he went off for 41.2" about Derrick Henry is accurate
    // rather than assumed, and the player awards legitimately say it. What
    // must never happen is a masculine pronoun that tracks the MANAGER.
    //
    // So compare against a they/them manager, for whom NO masculine pronoun
    // can be manager-derived. Whatever masculine pronouns remain there are the
    // player's, and a she/her manager must have exactly the same ones — no
    // more. A hardcoded "he" about the manager shows up as a surplus.
    const masc = (s: string) => (s.match(/\b(he|his|him)\b/gi) ?? []).length
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        for (let week = 1; week <= 10; week++) {
          const her = text(key, { ...branch, week, managerFirst: 'Bree' })
          const neutral = text(key, { ...branch, week, managerFirst: 'Nobody' })
          expect(masc(her), `${key} week ${week} used "he" about Bree`)
            .toBe(masc(neutral))
          expect(her, `${key} week ${week} leaked a masculine possessive`)
            .not.toMatch(/\bBree[’']s? (he|his|him)\b/i)
        }
      }
    }
  })

  it('actually resolves manager pronouns rather than avoiding them', () => {
    // At least one award must read differently for a she/her recipient than
    // for a he/him one, or the check above is testing nothing.
    const differs = COMMENTARY_KEYS.filter((key) =>
      branchesFor(key).some((branch) =>
        text(key, { ...branch, week: 3, managerFirst: 'Bree' })
        !== text(key, { ...branch, week: 3, managerFirst: 'Jesse' })
          .replace(/\bJesse\b/g, 'Bree')))
    expect(differs.length).toBeGreaterThan(0)
  })

  it('agrees with a plural verb for an unlisted manager', () => {
    // Anyone not in the pronoun table takes they/them, which takes "were".
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        for (let week = 1; week <= 10; week++) {
          const neutral = text(key, { ...branch, week, managerFirst: 'Nobody' })
          expect(neutral, `${key} week ${week}`).not.toMatch(/\bthey was\b/i)
          expect(neutral, `${key} week ${week}`).not.toMatch(/\bthey has\b/i)
          expect(neutral, `${key} week ${week}`).not.toMatch(/\bthey does\b/i)
        }
      }
    }
  })

  it('never claims Slay Girl Slay was a clean sweep', () => {
    // The count is "starters who beat their projection", which was 7 of 10
    // the week the card claimed "not one weak link in the whole lineup".
    for (let week = 1; week <= 12; week++) {
      const s = text('slay_girl_slay', { week, value: '7' })
      expect(s).not.toMatch(/whole lineup/i)
      expect(s).not.toMatch(/not one weak link/i)
      expect(s).not.toMatch(/every starter/i)
    }
  })

  it('never says The Socialist had a good week', () => {
    // The award measures how EVENLY a lineup scored, not how well. A flat bad
    // week qualifies, and that is The Dumpster Fire's business.
    for (let week = 1; week <= 12; week++) {
      const s = text('socialist', { week })
      expect(s).not.toMatch(/\b(great|excellent|strong|dominant) (week|lineup)\b/i)
    }
  })

  it('never claims to know who else wanted a waiver pickup', () => {
    // The engine has no ADP and no news. "Nobody else wanted him" was a guess,
    // and a wrong one.
    for (const branch of branchesFor('waiver_wire_wizard')) {
      for (let week = 1; week <= 12; week++) {
        const s = text('waiver_wire_wizard', { ...branch, week })
        expect(s).not.toMatch(/nobody else wanted/i)
        expect(s).not.toMatch(/everyone (else )?passed/i)
      }
    }
  })

  it('stays inside the roast boundary', () => {
    // SOUL.md: managers are roasted for decisions. Injury, health and the
    // person are never material.
    const banned = /\b(injur|concuss|hurt|hospital|arrest|divorce|idiot|moron|stupid|pathetic)/i
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        for (let week = 1; week <= 12; week++) {
          expect(text(key, { ...branch, week }), `${key} week ${week}`)
            .not.toMatch(banned)
        }
      }
    }
  })

  it('writes American English', () => {
    const banned = /\b(favour|colour|behaviour|defence|offence|whilst|realise|recognise|grey)\b/i
    for (const key of COMMENTARY_KEYS) {
      for (const branch of branchesFor(key)) {
        for (let week = 1; week <= 12; week++) {
          expect(text(key, { ...branch, week }), `${key} week ${week}`)
            .not.toMatch(banned)
        }
      }
    }
  })
})

describe('firstName', () => {
  it('takes the first word, and falls back rather than printing nothing', () => {
    expect(firstName('Chenell Basilio')).toBe('Chenell')
    expect(firstName('  Jay  Clouse ')).toBe('Jay')
    expect(firstName(null)).toBe('Somebody')
    expect(firstName('')).toBe('Somebody')
  })
})

/**
 * The league is American and so is its spelling.
 *
 * This has now shipped twice: ten uses of "defence" in one draft roast, and
 * then "defence" five times in a week 3 recap, including the summary that
 * appears on the archive card. James flagged both.
 *
 * The draft skill already carried "this is an American league" as a prose
 * instruction and the model wrote "defence" anyway, which is the whole reason
 * this is a test and not a note. An instruction is not a control.
 */
import { describe, it, expect } from 'vitest'
import { RECAPS, type RecapBlock } from '@/content/recaps'
import { LEAGUE_NOTES } from '@/content/league-notes'
import { BURNER } from '@/content/author'
import {
  findBritishSpellings, toAmericanEnglish, AMERICAN_SPELLINGS,
} from '@/lib/style/american-english'

const blockText = (b: RecapBlock): string => {
  switch (b.type) {
    case 'stat': return `${b.label} ${b.value} ${b.note ?? ''}`
    case 'scoreboard':
      return b.rows.map((r) => `${r.top} ${r.bottom} ${r.note ?? ''}`).join(' ')
    case 'paragraph':
    case 'heading':
    case 'quote': return b.text
    default: {
      const _exhaustive: never = b
      return _exhaustive
    }
  }
}

describe('published copy uses American spelling', () => {
  for (const r of RECAPS.filter((x) => x.published)) {
    it(`${r.slug} has no British spellings`, () => {
      const text = [
        r.title, r.summary, r.coverAlt ?? '',
        ...(r.predictions ?? []).flatMap((p) => [p.claim, p.resolution ?? '']),
        ...r.body.map(blockText),
      ].join('\n')
      const hits = findBritishSpellings(text)
      expect(
        hits.map((h) => `${h.found} -> ${h.suggest}`),
        `${r.slug}: British spelling in published copy`,
      ).toEqual([])
    })
  }

  it('the author bio is American', () => {
    expect(findBritishSpellings(`${BURNER.name} ${BURNER.title} ${BURNER.bio}`)).toEqual([])
  })

  it('league notes are American', () => {
    // These are quoted and paraphrased into recaps, so a British spelling here
    // propagates into print.
    for (const n of LEAGUE_NOTES) {
      expect(findBritishSpellings(n.note), `week ${n.week} note`).toEqual([])
    }
  })
})

describe('the spelling checker itself', () => {
  it('catches the word that keeps shipping', () => {
    expect(findBritishSpellings('an entire professional football defence'))
      .toEqual([{ found: 'defence', suggest: 'defense' }])
  })

  it('preserves capitalisation in its suggestion', () => {
    expect(findBritishSpellings('Defence wins championships')[0])
      .toEqual({ found: 'Defence', suggest: 'Defense' })
  })

  it('matches whole words only', () => {
    // "offences" is plural and not in the map; "defenceman" must not half-match
    // and produce nonsense.
    expect(findBritishSpellings('defenceman')).toEqual([])
    expect(findBritishSpellings('greyhound')).toEqual([])
  })

  it('leaves American text alone', () => {
    expect(findBritishSpellings('The defense scored zero. Gray sky. No color.'))
      .toEqual([])
  })

  it('rewrites a whole string', () => {
    expect(toAmericanEnglish('The defence showed poor judgement whilst grey.'))
      .toBe('The defense showed poor judgment while gray.')
  })

  it('every mapping actually changes the word', () => {
    // A key that maps to itself is a typo that silently does nothing.
    for (const [uk, us] of Object.entries(AMERICAN_SPELLINGS)) {
      expect(uk, `${uk} maps to itself`).not.toBe(us)
    }
  })
})

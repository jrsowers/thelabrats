/**
 * This league is American. So is its spelling.
 *
 * ⚠️ THE MODEL WRITING THIS SITE DRIFTS BRITISH, REPEATEDLY, AND IT IS
 * INVISIBLE TO THE PERSON WRITING IT. It has shipped "defence" in a draft
 * roast ten times in one document, and again in a week 3 recap summary that
 * went out to twelve people. James has now flagged it twice.
 *
 * A style note in a prompt did not hold it — the draft skill already carried
 * "this is an American league" in prose and the model wrote "defence" anyway.
 * So this is a list, used by a check, enforced by a test. Same lesson as the
 * gendered-collective guard and the settled-week rank source: **an instruction
 * is not a control.**
 *
 * Deliberately covers comments and identifiers too, not just reader-facing
 * copy. James: "remove UK English from your protocols... should use US English
 * all over." A codebase whose comments read British is what primes the next
 * paragraph to.
 */

/** British spelling -> the American one. Lowercase keys; matching is case-insensitive. */
export const AMERICAN_SPELLINGS: Record<string, string> = {
  // The ones that actually keep happening here.
  defence: 'defense',
  offence: 'offense',
  practise: 'practice',
  licence: 'license',
  // -ise / -isation
  realise: 'realize', realised: 'realized', realising: 'realizing',
  recognise: 'recognize', recognised: 'recognized', recognising: 'recognizing',
  organise: 'organize', organised: 'organized', organising: 'organizing',
  apologise: 'apologize', apologised: 'apologized',
  analyse: 'analyze', analysed: 'analyzed', analysing: 'analyzing',
  paralyse: 'paralyze',
  specialise: 'specialize', specialised: 'specialized',
  summarise: 'summarize', summarised: 'summarized',
  // -our
  colour: 'color', coloured: 'colored', colours: 'colors',
  honour: 'honor', honoured: 'honored',
  behaviour: 'behavior',
  favourite: 'favorite', favourites: 'favorites', favour: 'favor',
  humour: 'humor',
  rumour: 'rumor', rumours: 'rumors',
  neighbour: 'neighbor',
  armour: 'armor',
  // -re
  centre: 'center', centred: 'centered',
  theatre: 'theater',
  metre: 'meter', metres: 'meters',
  calibre: 'caliber',
  sombre: 'somber',
  // doubled consonants
  travelled: 'traveled', travelling: 'traveling', traveller: 'traveler',
  cancelled: 'canceled', cancelling: 'canceling',
  labelled: 'labeled', labelling: 'labeling',
  modelling: 'modeling', modelled: 'modeled',
  fuelled: 'fueled',
  marvellous: 'marvelous',
  // single-l where American doubles
  enrol: 'enroll', fulfil: 'fulfill', instalment: 'installment',
  skilful: 'skillful', wilful: 'willful', appal: 'appall', distil: 'distill',
  // miscellaneous
  grey: 'gray',
  whilst: 'while',
  amongst: 'among',
  learnt: 'learned',
  spelt: 'spelled',
  burnt: 'burned',
  dreamt: 'dreamed',
  leapt: 'leaped',
  judgement: 'judgment',
  cheque: 'check',
  tyre: 'tire',
  kerb: 'curb',
  plough: 'plow',
  draught: 'draft',
  mould: 'mold',
  smoulder: 'smolder',
  sulphur: 'sulfur',
  jewellery: 'jewelry',
  sceptical: 'skeptical', sceptic: 'skeptic',
  storey: 'story',
  aeroplane: 'airplane',
  manoeuvre: 'maneuver',
  aluminium: 'aluminum',
  speciality: 'specialty',
  catalogue: 'catalog',
  programme: 'program',
  enquiry: 'inquiry',
  pyjamas: 'pajamas',
  moustache: 'mustache',
  // "maths" is the British singular; "math" is American.
  maths: 'math',
}

const PATTERN = new RegExp(
  `\\b(${Object.keys(AMERICAN_SPELLINGS).join('|')})\\b`,
  'gi',
)

export interface SpellingHit {
  found: string
  suggest: string
}

/** Every British spelling in `text`, with its American replacement. */
export function findBritishSpellings(text: string): SpellingHit[] {
  const out: SpellingHit[] = []
  for (const m of text.matchAll(PATTERN)) {
    const found = m[0]
    const suggest = AMERICAN_SPELLINGS[found.toLowerCase()]
    if (!suggest) continue
    // Preserve the original capitalisation so the suggestion is drop-in.
    out.push({
      found,
      suggest: found[0] === found[0].toUpperCase()
        ? suggest[0].toUpperCase() + suggest.slice(1)
        : suggest,
    })
  }
  return out
}

/** Rewrite every British spelling in `text`. */
export function toAmericanEnglish(text: string): string {
  return text.replace(PATTERN, (found) => {
    const suggest = AMERICAN_SPELLINGS[found.toLowerCase()]
    if (!suggest) return found
    return found[0] === found[0].toUpperCase()
      ? suggest[0].toUpperCase() + suggest.slice(1)
      : suggest
  })
}

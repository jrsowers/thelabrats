import type { DossierEntry } from './writer'

/**
 * Rejects roasts that invent a player's CURRENT status.
 *
 * The voice guide forbids extrapolating a dossier note forward, and the model
 * broke that rule twice in sixty roasts anyway — writing "he is listed as
 * questionable" from a note that only said he was hurt on a date. Telling a
 * model not to do something is not a control. This is.
 *
 * Deliberately narrow: it catches present-tense status claims, which is the one
 * failure mode actually observed. It is not a general fact-checker and does not
 * pretend to be.
 */
const STATUS_CLAIM = new RegExp(
  '\\b(' +
  'is (?:listed|still|currently) (?:as )?\\w+|' +
  'is (?:questionable|doubtful|out|inactive|day-to-day|day to day)|' +
  'remains (?:out|sidelined|questionable|doubtful)|' +
  'has (?:not )?been cleared|' +
  '(?:is|was) ruled out|' +
  'expected (?:back|to (?:play|miss|return))|' +
  'will (?:miss|play|return)' +
  ')\\b', 'i',
)

export interface ValidationResult { ok: boolean; reason?: string }

/**
 * A status claim is allowed only when the dossier actually says it. Matching on
 * the claimed word keeps a legitimate "he is out for the season" note usable.
 */
export function validateRoast(text: string, news?: DossierEntry): ValidationResult {
  const m = STATUS_CLAIM.exec(text)
  if (!m) return { ok: true }

  const notes = (news?.notes ?? []).join(' ').toLowerCase()
  if (!notes) {
    return { ok: false, reason: `claims a current status ("${m[0]}") with no dossier entry at all` }
  }

  // Every meaningful word in the claim must appear somewhere in the notes.
  const words = m[0].toLowerCase().split(/\s+/)
    .filter((w) => !['is', 'was', 'has', 'been', 'not', 'as', 'to', 'will'].includes(w))
  const grounded = words.every((w) => notes.includes(w))

  return grounded
    ? { ok: true }
    : { ok: false, reason: `claims a current status ("${m[0]}") the dossier does not state` }
}


/**
 * Catches prose that was written rather than spoken.
 *
 * The bible tells the model to use contractions and concrete nouns. It mostly
 * complies and then slips — "a man who is not allowed to touch the ball",
 * "before the country would have bothered". Both read as an essay, and James
 * spotted them immediately. Same lesson as the status guard: an instruction is
 * not a control.
 *
 * These are rewrite signals, not grounds for a fallback. A stiff joke is still
 * a joke; a hallucinated injury is not. So this drives a retry, and the roast
 * survives if the retry fails.
 */
const UNCONTRACTED = /\b(is|was|are|were|does|did|do|has|have|had|will|would|could|should|can) not\b/i
const ABSTRACTION = /\b(the (?:country|consensus|market|industry|field|public|league average))\b/i
const BRITISH = /\b(defence|offence|practise|realise|recognise|organise|apologise|favourite|colour|honour|behaviour|whilst|judgement)\b/i
/**
 * Gendered collectives. Four of the twelve managers are women, and a headline
 * reading "Twelve Men Walk Into A Draft Room" shipped before anyone caught it.
 */
const GENDERED_COLLECTIVE = /\b(twelve|all twelve|the) (men|guys|boys|fellas|gentlemen)\b|\bgentlemen\b|\bevery man in (this|the) league\b/i
const THROAT_CLEARING = /\b(which means|at this point|it should be noted|in fairness|the fact that|arguably|somewhat|roughly speaking)\b/i

export interface StyleResult { ok: boolean; notes: string[] }

export function checkStyle(text: string): StyleResult {
  const notes: string[] = []

  const u = UNCONTRACTED.exec(text)
  if (u) notes.push(`uncontracted "${u[0]}" — nobody talks like that, contract it`)

  const a = ABSTRACTION.exec(text)
  if (a) notes.push(`abstraction "${a[0]}" — name a person or a place instead`)

  const t = THROAT_CLEARING.exec(text)
  if (t) notes.push(`throat-clearing "${t[0]}" — cut it`)

  // This document primed the model with British spellings and it copied them:
  // ten uses of "defence" in one draft, in an American football league.
  const b = BRITISH.exec(text)
  if (b) notes.push(`British spelling "${b[0]}" — this is an American league`)

  const g = GENDERED_COLLECTIVE.exec(text)
  if (g) notes.push(`gendered collective "${g[0]}" — four of the twelve managers are women`)

  return { ok: notes.length === 0, notes }
}


/**
 * Mechanical rules from ROAST-WRITER.md that can be checked rather than hoped
 * for: length, punctuation, and the blacklist of phrases it names as weak AI
 * comedy. Same rationale as everything else in this file — an instruction has
 * slipped here four separate times.
 */
const BANNED_PUNCT: [RegExp, string][] = [
  [/—/, 'em dash — the spec bans them'],
  [/;/, 'semicolon — the spec says avoid'],
  [/!/, 'exclamation mark — the spec bans them'],
  [/#\w/, 'hashtag'],
]

const WEAK_AI_COMEDY = [
  'bold strategy', "let's see if it pays off", 'only time will tell',
  'he got his guy', 'somebody had to take him', 'this was certainly a choice',
  'in a shocking turn of events', 'tell me you', 'living rent-free',
  'the fantasy gods', 'a masterclass in', 'make it make sense',
  'not a roster. it is a cry for help', 'not a roster, it is a cry for help',
  'drafted a lifestyle', 'more support group',
]

export const ROAST_WORDS = { min: 12, max: 45 }

export function checkCraft(text: string): StyleResult {
  const notes: string[] = []

  for (const [re, why] of BANNED_PUNCT) {
    if (re.test(text)) { notes.push(why); break }
  }

  const lower = text.toLowerCase()
  const weak = WEAK_AI_COMEDY.find((w) => lower.includes(w))
  if (weak) notes.push(`"${weak}" is on the weak-AI-comedy list`)

  const words = text.trim().split(/\s+/).length
  if (words > ROAST_WORDS.max) {
    notes.push(`${words} words — the spec caps a roast at ${ROAST_WORDS.max}. Cut, do not rewrite`)
  }

  return { ok: notes.length === 0, notes }
}

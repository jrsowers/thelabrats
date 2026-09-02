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

  return { ok: notes.length === 0, notes }
}

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

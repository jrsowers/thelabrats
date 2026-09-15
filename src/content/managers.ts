/**
 * How to refer to each manager.
 *
 * ⚠️ THIS SUPERSEDES THE OLD THEY/THEM-FOR-EVERYONE RULE. That was a safe
 * default adopted when nobody had told us the roster's pronouns — not a claim
 * that the managers use they/them. James supplied the real list on 2026-09-15,
 * explicitly so copy could stop defaulting to neutral phrasing, which had
 * started to read as stilted ("It requires Colin to take Colin's advice").
 *
 * The narrower rule still stands and always will: **never infer a pronoun from
 * a name.** A manager who is not in this table has no pronoun here to use —
 * ask, and fall back to they/them until the answer arrives. That is what
 * `pronounsFor` does, and it is why it never guesses.
 *
 * Keyed on FIRST NAME because that is what the recaps and awards actually
 * print. `franchises.manager_name` holds the full name; `firstNameOf` is the
 * bridge.
 */
export interface Pronouns {
  /** they */
  subject: string
  /** them */
  object: string
  /** their */
  possessive: string
  /** theirs */
  possessivePronoun: string
  /** themselves */
  reflexive: string
}

export const THEY: Pronouns = {
  subject: 'they', object: 'them', possessive: 'their',
  possessivePronoun: 'theirs', reflexive: 'themselves',
}
const HE: Pronouns = {
  subject: 'he', object: 'him', possessive: 'his',
  possessivePronoun: 'his', reflexive: 'himself',
}
const SHE: Pronouns = {
  subject: 'she', object: 'her', possessive: 'her',
  possessivePronoun: 'hers', reflexive: 'herself',
}

/** First name → pronouns. Supplied by James, 2026-09-15. */
export const MANAGER_PRONOUNS: Record<string, Pronouns> = {
  Jesse: HE,    // Jesse Anderson
  Doug: HE,     // Doug Rotman
  Colin: HE,    // Colin Gray
  Mike: HE,     // Mike Schmitz
  Tyler: HE,    // Tyler Lindley
  Jay: HE,      // Jay Clouse
  James: HE,    // James Sowers
  Evan: HE,     // Evan Jordan
  Justin: HE,   // Justin Moore
  Chenell: SHE, // Chenell Basilio
  Bree: SHE,    // Bree Noble
  Keshia: SHE,  // Keshia Villas
}

export const MANAGER_FIRST_NAMES = Object.keys(MANAGER_PRONOUNS)

export const firstNameOf = (managerName: string): string =>
  managerName.trim().split(/\s+/)[0] ?? ''

/**
 * Pronouns for a manager, by first or full name.
 *
 * Returns they/them for anyone unlisted — a new manager, a typo, a name we do
 * not have. That is a deliberate safe default and NOT a guess: the alternative
 * is inferring from a name, which is how you misgender somebody.
 */
export function pronounsFor(name: string): Pronouns {
  return MANAGER_PRONOUNS[firstNameOf(name)] ?? THEY
}

/** True when this manager's pronouns are actually known. */
export const hasKnownPronouns = (name: string): boolean =>
  firstNameOf(name) in MANAGER_PRONOUNS

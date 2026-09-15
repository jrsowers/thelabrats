/**
 * The recap byline.
 *
 * One author, defined once, because a recap written by "the site" reads like a
 * database and a recap written by a named correspondent reads like a broadcast.
 * Dr. Bunsen Burner is fictional and obviously so — the point of him is voice,
 * not deception, and the bio says as much in his own register.
 *
 * His full craft spec lives in
 * `.claude/skills/fantasy-weekly-recap/references/voice.md`.
 * This file is only what the page renders.
 */
export interface Author {
  name: string
  /** Sits under the name in the byline. */
  title: string
  /** Path under /public. */
  avatar: string
  /** One or two sentences for the end-of-recap card. */
  bio: string
}

export const BURNER: Author = {
  name: 'Dr. Bunsen Burner',
  title: 'Expert In Applied Gridiron Sciences',
  avatar: '/authors/bunsen-burner.jpg',
  bio:
    'Expert In Applied Gridiron Sciences, a discipline he named himself. He has ' +
    'never been permitted inside a real broadcast booth and is making the most ' +
    'of this one. Twelve subjects. Thirteen weeks. No control group that ' +
    'consented.',
}

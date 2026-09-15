/**
 * The record book's shared vocabulary.
 *
 * Three things here are deliberate and easy to get wrong later.
 *
 * **Every record is ALL-TIME.** There is no current-season scope. Yahoo prints
 * each record twice — once for this season, once for league history — which
 * doubles the page and, one week into a season, prints the same row twice with
 * the same number in it. A record measured over a season ("most points in a
 * season") is still an all-time record; `scope` says what the number *measures*,
 * not which games were eligible.
 *
 * **Ties are normal, not an edge case.** In an inaugural season the all-time
 * record and the season record are the same thing, so six teams tie at one win.
 * James called this out explicitly. A record therefore has `holders`, plural,
 * and the renderer shows all of them.
 *
 * **`tone` is good/bad, not high/low.** The old shape used `polarity: 'high' |
 * 'low'`, which conflated "this number is large" with "this is an achievement".
 * They come apart constantly: the largest margin of defeat is a big number and
 * a bad day; the lowest winning score is a small number and still a win.
 */

/** Which section of the page a record belongs to. */
export type RecordGroup = 'team' | 'manager' | 'player'

/** What the number measures — NOT which seasons were eligible. */
export type RecordScope = 'week' | 'season'

/** Drives the colour. Green for the good end, red for the bad. */
export type RecordTone = 'good' | 'bad'

export type RecordFormat = 'points' | 'count' | 'percent' | 'places'

export interface RecordPlayerRef {
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
}

/** One team's claim on a record. Several may share the same value. */
export interface RecordHolder {
  teamId: number
  year: number
  /** Null for season-scope records, which span a whole year. */
  week: number | null
  /** The supporting line under the name: opponent, final score, whatever fits. */
  context: string
  /** Set on player records so the card can show a headshot. */
  player?: RecordPlayerRef | null
}

export interface LeagueRecord {
  key: string
  label: string
  group: RecordGroup
  scope: RecordScope
  tone: RecordTone
  format: RecordFormat
  value: number
  /**
   * Unit shown beside the number. Without it a bare "197.42" on a schedule
   * record reads as a score somebody put up rather than the average their
   * opponents did.
   */
  valueSuffix?: string
  /**
   * Print an explicit + or −. Only for records that measure a DISTANCE FROM
   * something, where the direction is the whole point: 21.44 over projection
   * and 19.00 under it are different stories told by the same digits.
   */
  signed?: '+' | '-'
  /** At least one. More than one is a tie, and ties are expected early on. */
  holders: RecordHolder[]
}

export const fmtRecord = (
  value: number, format: RecordFormat, signed?: '+' | '-',
): string => {
  const body = (() => {
    switch (format) {
      case 'points': return value.toFixed(2)
      case 'percent': return `${(value * 100).toFixed(1)}%`
      case 'places': return String(Math.round(value))
      case 'count': return String(Math.round(value))
    }
  })()
  // Values are stored as magnitudes, so the sign is a label rather than
  // arithmetic — an under-performance of 19.00 is stored positive and shown
  // as −19.00.
  return signed ? `${signed === '-' ? '\u2212' : '+'}${body}` : body
}

/**
 * Display order within a group.
 *
 * Explicit, because the interesting pairs are opposites and they have to sit
 * next to each other: the largest win beside the largest defeat, the narrowest
 * beside the narrowest. Computation order is an accident of how the file is
 * written and should never decide layout.
 */
export const RECORD_ORDER: string[] = [
  // Team
  'highest_score', 'lowest_score',
  'highest_losing', 'lowest_winning',
  'largest_margin', 'largest_defeat',
  'smallest_margin', 'smallest_defeat',
  'highest_combined', 'lowest_combined',
  'largest_comeback',
  'most_wins', 'most_losses',
  'best_win_pct',
  'longest_win_streak', 'longest_losing_streak',
  'most_points_season', 'fewest_points_season',
  'best_scoring_avg', 'worst_scoring_avg',
  'toughest_schedule', 'easiest_schedule',
  // Manager
  'most_bench_points',
  'best_waiver_pickup',
  'draft_steal', 'draft_bust',
  'most_moves_week', 'most_moves_season',
  'most_studs', 'most_duds',
  // Player
  'best_player_game', 'worst_player_game',
  'biggest_overperformance', 'biggest_underperformance',
  'best_bench_game',
]

/**
 * Collect every entry sharing the best value.
 *
 * `better(a, b)` returns true when a beats b. Comparing on the FORMATTED value
 * rather than the raw float is deliberate: two teams on 119.88 and 119.8849 are
 * a tie on a page that prints two decimals, and showing one of them as sole
 * record holder is a lie the reader can see.
 */
export function bestOf<T>(
  items: T[],
  valueOf: (item: T) => number,
  better: (a: number, b: number) => boolean,
  decimals = 2,
): { value: number; winners: T[] } | null {
  if (items.length === 0) return null
  const round = (n: number) => Number(n.toFixed(decimals))

  let best = round(valueOf(items[0]))
  for (const item of items) {
    const v = round(valueOf(item))
    if (better(v, best)) best = v
  }
  return { value: best, winners: items.filter((i) => round(valueOf(i)) === best) }
}

export const HIGH = (a: number, b: number) => a > b
export const LOW = (a: number, b: number) => a < b

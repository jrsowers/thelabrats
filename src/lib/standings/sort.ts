/**
 * Sorting the standings table.
 *
 * Deterministic and unit-tested, kept out of the component on purpose. The
 * rules below are the ones James asked for, and each is a thing that can be
 * gotten quietly wrong:
 *
 * - **A row is one object.** `sortRows` reorders an array of whole rows and
 *   never looks inside one except through `Column.value`. There is no second
 *   array held in parallel and no cell fetched by index, so no sequence of
 *   clicks can hand one team's record to another team's name. `tests/
 *   standings-sort.test.ts` asserts the sorted output is a permutation of the
 *   input with every object identical.
 *
 * - **One sort at a time.** The state is a single `{ id, dir }`, not a set.
 *   `nextSort` REPLACES the active column rather than layering a second one
 *   under it, because two columns claiming the same table is a question with
 *   no honest answer.
 *
 * - **Ties fall back to the seed.** Six teams are 2-1-0. Sorting by record
 *   must not shuffle them, so the comparator's last resort is the row's
 *   original index — the standings order the server sent. Done explicitly
 *   rather than by leaning on `Array.sort` stability, so the guarantee is
 *   visible in the code that depends on it.
 *
 * - **A missing value sorts last in BOTH directions.** A team ESPN has not
 *   simulated is absent from the ranking, not at the bottom of it. Reversing
 *   the sort must not float it to the top.
 */

export interface StandingsTableRow {
  seasonTeamId: number
  rank: number
  /** Places gained or lost since last week. 0 renders a dash. */
  movement: number
  name: string
  manager: string | null
  abbrev: string | null
  photoUrl: string | null
  logoUrl: string | null
  isChampion: boolean
  championYear: number | null
  /** Shown only for head-to-head tiebreaks; points-for is already a column. */
  tiebreakNote: string | null
  wins: number
  losses: number
  ties: number
  winPct: number
  pointsFor: number
  pointsAgainst: number
  streak: { type: 'W' | 'L' | 'T'; count: number } | null
  /** ESPN's own counter: waiver claims and free-agent adds. */
  moves: number
  /** ESPN's 0–1 probability. Null when ESPN has published no simulation. */
  playoffOdds: number | null
  clinched: boolean
  eliminated: boolean
  inPlayoffs: boolean
}

export type SortId =
  | 'rank' | 'team' | 'record' | 'pf' | 'pa' | 'streak' | 'moves' | 'playoff'
export type Dir = 'asc' | 'desc'
export interface SortState { id: SortId; dir: Dir }

export interface SortColumn {
  id: SortId
  label: string
  title?: string
  /** Which way the FIRST click sorts. Clicking the same column flips it. */
  first: Dir
  /** The scalar this column sorts on. Null sorts last in both directions. */
  value: (r: StandingsTableRow) => number | string | null
  /** How each direction reads, for the screen-reader summary. */
  reads: [asc: string, desc: string]
}

/**
 * A streak as one signed number: W-3 is 3, L-2 is −2, a tie or none is 0.
 *
 * James: *"Wins are high, Losses are low."* So descending runs W-3, W-2, W-1,
 * T/none, L-1, L-2 — hottest to coldest. Sorting by letter and then by count
 * inside each group would instead rank a four-game losing streak above a
 * one-game one, which is backwards on the half of the table that is losing.
 */
export function streakValue(s: StandingsTableRow['streak']): number {
  if (!s || s.type === 'T') return 0
  return s.type === 'W' ? s.count : -s.count
}

/** Every sortable column, in display order. */
export const SORT_COLUMNS: SortColumn[] = [
  {
    id: 'rank', label: 'Rank', first: 'asc',
    value: (r) => r.rank,
    reads: ['first seed first', 'last seed first'],
  },
  {
    id: 'team', label: 'Team', first: 'asc',
    // Lowercased so "da REIGNING CHAMP" files under D, not after every
    // capitalized name — a raw localeCompare is case-sensitive enough to
    // surprise people in a league that types team names in any case it likes.
    value: (r) => r.name.toLowerCase(),
    reads: ['A to Z', 'Z to A'],
  },
  {
    id: 'record', label: 'W-L-T', first: 'desc',
    // Win percentage, not wins: it stays correct if anybody ever plays a
    // different number of games, and it counts a tie as the half-win it is.
    value: (r) => r.winPct,
    reads: ['worst record first', 'best record first'],
  },
  {
    id: 'pf', label: 'PF', first: 'desc',
    value: (r) => r.pointsFor,
    reads: ['fewest points first', 'most points first'],
  },
  {
    id: 'pa', label: 'PA', first: 'desc',
    value: (r) => r.pointsAgainst,
    reads: ['fewest points against first', 'most points against first'],
  },
  {
    id: 'streak', label: 'Streak', first: 'desc',
    value: (r) => streakValue(r.streak),
    reads: ['longest losing streak first', 'longest winning streak first'],
  },
  {
    id: 'moves', label: 'Moves', first: 'desc',
    title: "ESPN's own counter: waiver claims and free-agent adds",
    value: (r) => r.moves,
    reads: ['fewest moves first', 'most moves first'],
  },
  {
    id: 'playoff', label: 'Playoff %', first: 'desc',
    title: "ESPN's own playoff probability",
    value: (r) => r.playoffOdds,
    reads: ['longest odds first', 'best odds first'],
  },
]

/**
 * The order the server sends, which is the seeding.
 *
 * Held in component state with no persistence, so a load or a refresh returns
 * to it. A sort that survived a reload would mean somebody opening the page
 * on a Sunday could be looking at a table ordered by moves and read it as the
 * standings.
 */
export const DEFAULT_SORT: SortState = { id: 'rank', dir: 'asc' }

export const columnById = (id: SortId): SortColumn =>
  SORT_COLUMNS.find((c) => c.id === id) ?? SORT_COLUMNS[0]

/** Clicking the active column flips it; any other column starts fresh. */
export function nextSort(current: SortState, id: SortId): SortState {
  if (current.id === id) {
    return { id, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { id, dir: columnById(id).first }
}

/**
 * Reorder whole rows. Never mutates the input, never reaches into a row for
 * anything but its sort value.
 */
export function sortRows(
  rows: StandingsTableRow[], sort: SortState,
): StandingsTableRow[] {
  const column = columnById(sort.id)
  // The original index is the seeding, and the tiebreak of last resort.
  const keyed = rows.map((row, seed) => ({ row, seed, v: column.value(row) }))

  keyed.sort((a, b) => {
    if (a.v === null || b.v === null) {
      if (a.v === b.v) return a.seed - b.seed
      return a.v === null ? 1 : -1
    }
    const d = typeof a.v === 'string' && typeof b.v === 'string'
      ? a.v.localeCompare(b.v)
      : Number(a.v) - Number(b.v)
    return (sort.dir === 'asc' ? d : -d) || a.seed - b.seed
  })

  return keyed.map((k) => k.row)
}

/**
 * Sorting the standings table.
 *
 * The four rules James asked for, each as a test rather than a comment:
 * a row stays whole, one sort at a time, the default is the seeding, and
 * every column sorts the way he described it.
 */
import { describe, it, expect } from 'vitest'
import {
  SORT_COLUMNS, DEFAULT_SORT, columnById, nextSort, sortRows, streakValue,
  type SortId, type SortState, type StandingsTableRow,
} from '@/lib/standings/sort'

let nextId = 1
function team(over: Partial<StandingsTableRow> = {}): StandingsTableRow {
  const id = nextId++
  return {
    seasonTeamId: id, rank: id, movement: 0,
    name: `Team ${id}`, manager: `Manager ${id}`, abbrev: `T${id}`,
    photoUrl: null, logoUrl: null, isChampion: false, championYear: null,
    tiebreakNote: null,
    wins: 0, losses: 0, ties: 0, winPct: 0,
    pointsFor: 0, pointsAgainst: 0, streak: null,
    moves: 0, playoffOdds: null,
    clinched: false, eliminated: false, inPlayoffs: false,
    ...over,
  }
}

/** Six teams, deliberately with every column disagreeing with the seeding. */
function league(): StandingsTableRow[] {
  nextId = 1
  return [
    team({ name: "Tyler's Talented Team", rank: 1, wins: 2, losses: 1, winPct: 2 / 3, pointsFor: 498.82, pointsAgainst: 416.52, streak: { type: 'W', count: 2 }, moves: 4, playoffOdds: 0.682 }),
    team({ name: 'Mr. Anderson',          rank: 2, wins: 2, losses: 1, winPct: 2 / 3, pointsFor: 443.22, pointsAgainst: 357.44, streak: { type: 'L', count: 1 }, moves: 2, playoffOdds: 0.592 }),
    team({ name: 'da Reigning Champ',     rank: 3, wins: 2, losses: 1, winPct: 2 / 3, pointsFor: 418.70, pointsAgainst: 397.96, streak: { type: 'L', count: 1 }, moves: 5, playoffOdds: 0.715 }),
    team({ name: 'Dad Bod',               rank: 4, wins: 2, losses: 1, winPct: 2 / 3, pointsFor: 417.66, pointsAgainst: 354.56, streak: { type: 'W', count: 3 }, moves: 3, playoffOdds: 0.677 }),
    team({ name: 'All Bark, All Bite',    rank: 5, wins: 1, losses: 2, winPct: 1 / 3, pointsFor: 368.74, pointsAgainst: 362.84, streak: { type: 'W', count: 1 }, moves: 2, playoffOdds: 0.399 }),
    team({ name: 'Burrow My Burden',      rank: 6, wins: 1, losses: 2, winPct: 1 / 3, pointsFor: 350.44, pointsAgainst: 365.20, streak: { type: 'L', count: 4 }, moves: 7, playoffOdds: null }),
  ]
}

const names = (rows: StandingsTableRow[]) => rows.map((r) => r.name)
const ranks = (rows: StandingsTableRow[]) => rows.map((r) => r.rank)
const by = (id: SortId, dir: 'asc' | 'desc') => sortRows(league(), { id, dir })

describe('data integrity', () => {
  // The rule James actually asked for: "a row stays together and is only
  // sorted by the element that's been selected."
  it('moves whole rows, never individual cells', () => {
    const rows = league()
    for (const col of SORT_COLUMNS) {
      for (const dir of ['asc', 'desc'] as const) {
        const out = sortRows(rows, { id: col.id, dir })

        expect(out).toHaveLength(rows.length)
        for (const row of out) {
          // Identity, not deep equality: every object in the output is one of
          // the input objects, so no field can have been recombined.
          expect(rows).toContain(row)
        }
        expect(new Set(out).size).toBe(rows.length)
      }
    }
  })

  it('never mutates or reorders the array it was given', () => {
    const rows = league()
    const before = [...rows]
    sortRows(rows, { id: 'pf', dir: 'asc' })
    sortRows(rows, { id: 'team', dir: 'desc' })
    expect(rows).toEqual(before)
  })

  it('keeps each row internally consistent after a sort', () => {
    // If sorting ever reassembled rows, a team's name and its points would
    // come apart. Pin the pairing rather than trusting the shape.
    const out = by('pf', 'desc')
    const pf = new Map(league().map((r) => [r.name, r.pointsFor]))
    for (const row of out) expect(row.pointsFor).toBe(pf.get(row.name))
  })
})

describe('one sort at a time', () => {
  it('replaces the active column rather than adding to it', () => {
    let s: SortState = DEFAULT_SORT
    s = nextSort(s, 'pf')
    expect(s).toEqual({ id: 'pf', dir: 'desc' })
    s = nextSort(s, 'moves')
    expect(s).toEqual({ id: 'moves', dir: 'desc' })
    // The state is a single column by construction — there is nowhere for a
    // second one to live.
    expect(Object.keys(s).sort()).toEqual(['dir', 'id'])
  })

  it('flips direction when the same column is clicked again', () => {
    let s: SortState = nextSort(DEFAULT_SORT, 'pa')
    expect(s.dir).toBe('desc')
    s = nextSort(s, 'pa')
    expect(s.dir).toBe('asc')
    s = nextSort(s, 'pa')
    expect(s.dir).toBe('desc')
  })

  it("opens each column on the direction that column's label promises", () => {
    for (const col of SORT_COLUMNS) {
      // Start somewhere else every time. Arriving at a column from itself is
      // the flip case, which the test above covers.
      const from: SortState = col.id === 'rank'
        ? { id: 'team', dir: 'desc' }
        : { id: 'rank', dir: 'desc' }
      expect(nextSort(from, col.id).dir).toBe(col.first)
    }
    // Rank opens best-seed-first; everything else opens best-value-first,
    // which is alphabetical for Team and highest for every number.
    expect(columnById('rank').first).toBe('asc')
    expect(columnById('team').first).toBe('asc')
    for (const id of ['record', 'pf', 'pa', 'streak', 'moves', 'playoff'] as const) {
      expect(columnById(id).first).toBe('desc')
    }
  })
})

describe('the default view', () => {
  it('is the seeding, highest rank first', () => {
    expect(DEFAULT_SORT).toEqual({ id: 'rank', dir: 'asc' })
    expect(ranks(sortRows(league(), DEFAULT_SORT))).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('reproduces the order the server sent, exactly', () => {
    const rows = league()
    expect(sortRows(rows, DEFAULT_SORT)).toEqual(rows)
  })
})

describe('each column', () => {
  it('Rank: high to low and back', () => {
    expect(ranks(by('rank', 'asc'))).toEqual([1, 2, 3, 4, 5, 6])
    expect(ranks(by('rank', 'desc'))).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('Team: A-Z and Z-A, ignoring case', () => {
    expect(names(by('team', 'asc'))).toEqual([
      'All Bark, All Bite', 'Burrow My Burden', 'da Reigning Champ',
      'Dad Bod', 'Mr. Anderson', "Tyler's Talented Team",
    ])
    expect(names(by('team', 'desc'))[0]).toBe("Tyler's Talented Team")
    // Lowercase "da" files under D rather than after every capitalized name.
    expect(names(by('team', 'asc')).indexOf('da Reigning Champ')).toBe(2)
  })

  it('W-L-T: best to worst, then worst to best', () => {
    expect(by('record', 'desc').map((r) => r.wins)).toEqual([2, 2, 2, 2, 1, 1])
    expect(by('record', 'asc').map((r) => r.wins)).toEqual([1, 1, 2, 2, 2, 2])
  })

  it('PF and PA: high to low', () => {
    expect(by('pf', 'desc')[0].pointsFor).toBe(498.82)
    expect(by('pf', 'asc')[0].pointsFor).toBe(350.44)
    expect(by('pa', 'desc')[0].pointsAgainst).toBe(416.52)
    expect(by('pa', 'asc')[0].pointsAgainst).toBe(354.56)
  })

  it('Moves: high to low', () => {
    expect(by('moves', 'desc').map((r) => r.moves)).toEqual([7, 5, 4, 3, 2, 2])
    expect(by('moves', 'asc').map((r) => r.moves)).toEqual([2, 2, 3, 4, 5, 7])
  })

  it('Playoff %: high to low', () => {
    expect(by('playoff', 'desc').map((r) => r.playoffOdds))
      .toEqual([0.715, 0.682, 0.677, 0.592, 0.399, null])
  })
})

describe('Streak sorts wins high and losses low', () => {
  it('reads a streak as one signed number', () => {
    expect(streakValue({ type: 'W', count: 3 })).toBe(3)
    expect(streakValue({ type: 'L', count: 4 })).toBe(-4)
    expect(streakValue({ type: 'T', count: 2 })).toBe(0)
    expect(streakValue(null)).toBe(0)
  })

  it('runs hottest to coldest, not grouped by letter', () => {
    const out = by('streak', 'desc').map((r) => `${r.streak?.type}-${r.streak?.count}`)
    expect(out).toEqual(['W-3', 'W-2', 'W-1', 'L-1', 'L-1', 'L-4'])
  })

  it('puts the longest losing streak last, not first among the losers', () => {
    // The failure this guards: sorting by type and then by count would rank
    // L-4 above L-1, making the coldest team look like the hottest loser.
    const desc = by('streak', 'desc')
    expect(desc.at(-1)?.streak).toEqual({ type: 'L', count: 4 })
    expect(by('streak', 'asc')[0].streak).toEqual({ type: 'L', count: 4 })
  })

  it('sorts a team with no streak between the winners and the losers', () => {
    const rows = [
      team({ rank: 1, streak: { type: 'L', count: 1 } }),
      team({ rank: 2, streak: null }),
      team({ rank: 3, streak: { type: 'W', count: 1 } }),
    ]
    expect(sortRows(rows, { id: 'streak', dir: 'desc' }).map((r) => r.rank))
      .toEqual([3, 2, 1])
  })
})

describe('ties fall back to the seeding', () => {
  it('leaves equally-ranked teams in seed order, in both directions', () => {
    // Four teams at 2-1-0. Sorting by record must not shuffle them.
    expect(ranks(by('record', 'desc'))).toEqual([1, 2, 3, 4, 5, 6])
    // Reversed, the two blocks swap but each block stays seeded internally.
    expect(ranks(by('record', 'asc'))).toEqual([5, 6, 1, 2, 3, 4])
  })

  it('breaks a tie on any column the same way', () => {
    // Two teams on 2 moves, seeded 2nd and 5th.
    expect(ranks(by('moves', 'desc')).slice(-2)).toEqual([2, 5])
    expect(ranks(by('moves', 'asc')).slice(0, 2)).toEqual([2, 5])
  })

  it('is stable across repeated sorts of the same column', () => {
    const once = by('record', 'desc')
    const twice = sortRows(once, { id: 'record', dir: 'desc' })
    expect(ranks(twice)).toEqual(ranks(once))
  })
})

describe('a missing value', () => {
  // ESPN publishes no simulation for some teams. Absent from the ranking is
  // not the same as bottom of it, so a null must not float to the top when
  // the sort is reversed.
  it('sorts last in both directions', () => {
    expect(by('playoff', 'desc').at(-1)?.playoffOdds).toBeNull()
    expect(by('playoff', 'asc').at(-1)?.playoffOdds).toBeNull()
  })

  it('keeps several missing values in seed order behind the rest', () => {
    const rows = [
      team({ rank: 1, playoffOdds: null }),
      team({ rank: 2, playoffOdds: 0.5 }),
      team({ rank: 3, playoffOdds: null }),
      team({ rank: 4, playoffOdds: 0.9 }),
    ]
    expect(sortRows(rows, { id: 'playoff', dir: 'desc' }).map((r) => r.rank))
      .toEqual([4, 2, 1, 3])
    expect(sortRows(rows, { id: 'playoff', dir: 'asc' }).map((r) => r.rank))
      .toEqual([2, 4, 1, 3])
  })
})

describe('the column list', () => {
  it('covers every column the table renders', () => {
    expect(SORT_COLUMNS.map((c) => c.label)).toEqual([
      'Rank', 'Team', 'W-L-T', 'PF', 'PA', 'Streak', 'Moves', 'Playoff %',
    ])
  })

  it('has no duplicate ids', () => {
    const ids = SORT_COLUMNS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('describes both directions of every column for screen readers', () => {
    for (const col of SORT_COLUMNS) {
      expect(col.reads).toHaveLength(2)
      expect(col.reads[0]).not.toBe(col.reads[1])
    }
  })
})

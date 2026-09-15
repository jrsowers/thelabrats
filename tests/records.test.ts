/**
 * Record book tests (§24.5). The rule that matters most: a record with no
 * qualifying game is OMITTED, not returned as zero — an empty record book must
 * look empty, not like a league where nobody has ever scored.
 */
import { describe, it, expect } from 'vitest'
import { computeRecords, computeCareers, type RecordMatchup } from '@/lib/records/compute'

/** Only one team holds it, and that team is `id`. */
const soleHolder = (r: { holders: { teamId: number }[] } | undefined, id: number) => {
  expect(r?.holders).toHaveLength(1)
  expect(r?.holders[0].teamId).toBe(id)
}

const g = (
  week: number, home: number, away: number, hs: number, as: number,
  status = 'FINAL', year = 2026,
): RecordMatchup => ({ week, year, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, status })

const season: RecordMatchup[] = [
  g(1, 1, 2, 178.40, 121.70), // highest score, largest margin, highest combined
  g(1, 3, 4, 88.00, 87.50),   // closest win, lowest winning score
  g(2, 1, 3, 95.00, 140.00),  // 1 loses with a decent score
  g(2, 2, 4, 61.20, 70.10),   // lowest score + lowest combined
]

const byKey = (m: RecordMatchup[]) =>
  new Map(computeRecords({ matchups: m }).map((r) => [r.key, r]))

describe('computeRecords', () => {
  it('returns nothing before a game has been played', () => {
    expect(computeRecords({ matchups: [] })).toEqual([])
    expect(computeRecords({ matchups: [g(1, 1, 2, 0, 0, 'SCHEDULED')] })).toEqual([])
  })

  it('ignores games that are not final', () => {
    expect(computeRecords({ matchups: [g(1, 1, 2, 200, 100, 'LIVE')] })).toEqual([])
  })

  it('finds the highest and lowest weekly scores', () => {
    const r = byKey(season)
    expect(r.get('highest_score')?.value).toBeCloseTo(178.40)
    soleHolder(r.get('highest_score'), 1)
    expect(r.get('lowest_score')?.value).toBeCloseTo(61.20)
  })

  it('finds the highest losing and lowest winning scores', () => {
    const r = byKey(season)
    // Losses: 121.70 (t2), 87.50 (t4), 95.00 (t1), 61.20 (t2).
    // The best of them is team 2's 121.70 in the blowout — not team 1's 95.00.
    expect(r.get('highest_losing')?.value).toBeCloseTo(121.70)
    soleHolder(r.get('highest_losing'), 2)
    // Wins: 70.10 (t4), 88.00 (t3), 140.00 (t3), 178.40 (t1).
    expect(r.get('lowest_winning')?.value).toBeCloseTo(70.10)
    soleHolder(r.get('lowest_winning'), 4)
  })

  it('splits a margin into the winner\u2019s record and the loser\u2019s', () => {
    // Same number, two records, two different teams named. Carrying only one
    // of them means the biggest beating in league history has no victim.
    const r = byKey(season)
    expect(r.get('largest_margin')?.value).toBeCloseTo(56.70)
    soleHolder(r.get('largest_margin'), 1)
    expect(r.get('largest_defeat')?.value).toBeCloseTo(56.70)
    soleHolder(r.get('largest_defeat'), 2)

    expect(r.get('smallest_margin')?.value).toBeCloseTo(0.50)
    soleHolder(r.get('smallest_margin'), 3)
    expect(r.get('smallest_defeat')?.value).toBeCloseTo(0.50)
    soleHolder(r.get('smallest_defeat'), 4)
  })

  it('names every team tied on a record, not just one of them', () => {
    // The inaugural-season case James called out: with one week played, six
    // teams sit on one win apiece and all six hold the record.
    const r = byKey([g(1, 1, 2, 100, 90), g(1, 3, 4, 80, 70)])
    const wins = r.get('most_wins')
    expect(wins?.value).toBe(1)
    expect(wins?.holders.map((h) => h.teamId).sort()).toEqual([1, 3])
  })

  it('ties break a streak rather than extending it', () => {
    const r = byKey([
      g(1, 1, 2, 100, 90),   // 1 wins
      g(2, 1, 3, 100, 100),  // 1 ties
      g(3, 1, 4, 100, 90),   // 1 wins
    ])
    // Two separate one-game runs, not a three-game one.
    expect(r.get('longest_win_streak')?.value).toBe(1)
  })

  it('colours by outcome rather than by the size of the number', () => {
    const r = byKey(season)
    expect(r.get('highest_score')?.tone).toBe('good')
    expect(r.get('lowest_score')?.tone).toBe('bad')
    // Both are large numbers; only one of them is a good day.
    expect(r.get('largest_margin')?.tone).toBe('good')
    expect(r.get('largest_defeat')?.tone).toBe('bad')
    // Both are small numbers; the win is still a win.
    expect(r.get('lowest_winning')?.tone).toBe('good')
    expect(r.get('toughest_schedule')?.tone).toBe('bad')
  })

  it('finds combined-score records', () => {
    const r = byKey(season)
    expect(r.get('highest_combined')?.value).toBeCloseTo(300.10)
    expect(r.get('lowest_combined')?.value).toBeCloseTo(131.30)
  })

  it('carries context on every holder, never a bare number', () => {
    for (const rec of computeRecords({ matchups: season })) {
      expect(rec.holders.length).toBeGreaterThan(0)
      for (const h of rec.holders) {
        expect(h.context.length).toBeGreaterThan(0)
        expect(h.context).not.toMatch(/undefined|NaN/)
        expect(h.year).toBeGreaterThan(2000)
        // Week-scope records name a week; season-scope ones span the year.
        if (rec.scope === 'week') expect(h.week).toBeGreaterThan(0)
        else expect(h.week).toBeNull()
      }
    }
  })

  it('omits margin records when every game was a tie', () => {
    const ties = [g(1, 1, 2, 100, 100)]
    const r = byKey(ties)
    expect(r.has('largest_margin')).toBe(false)
    expect(r.has('smallest_margin')).toBe(false)
    expect(r.has('largest_defeat')).toBe(false)
    // A tie is neither a win nor a loss, so these are omitted too.
    expect(r.has('highest_losing')).toBe(false)
    expect(r.has('lowest_winning')).toBe(false)
    // But the scores themselves still count.
    expect(r.has('highest_score')).toBe(true)
  })

  it('spans multiple seasons', () => {
    const multi = [...season, g(5, 1, 2, 210.00, 90.00, 'FINAL', 2027)]
    const r = byKey(multi)
    expect(r.get('highest_score')?.holders[0].year).toBe(2027)
    expect(r.get('highest_score')?.value).toBeCloseTo(210.00)
  })
})

describe('computeCareers', () => {
  it('accumulates across every season', () => {
    const lines = computeCareers(season)
    const t1 = lines.find((l) => l.teamId === 1)!
    expect(t1.games).toBe(2)
    expect(t1.wins).toBe(1)
    expect(t1.losses).toBe(1)
    expect(t1.pointsFor).toBeCloseTo(273.40)
  })

  it('counts a tie as half a win', () => {
    const lines = computeCareers([g(1, 1, 2, 100, 100)])
    expect(lines.find((l) => l.teamId === 1)!.winPct).toBe(0.5)
  })

  it('is empty before any game', () => {
    expect(computeCareers([])).toEqual([])
  })
})

describe('records only count weeks that are actually settled', () => {
  it('ignores a week still in progress', () => {
    // Player lines and transactions exist from the moment a week opens. Without
    // the settled-week filter, "most roster moves in one week" becomes a live
    // counter for the current week on a page of finished history.
    const matchups: RecordMatchup[] = [
      g(1, 1, 2, 100, 90),
      g(2, 1, 2, 0, 0, 'SCHEDULED'),
    ]
    const txn = (week: number, seasonTeamId: number) => ({
      year: 2026, week, seasonTeamId, kind: 'FREE_AGENT', acquiredPlayerIds: [],
    })
    const out = computeRecords({
      matchups,
      // Team 2 makes five moves in the unplayed week; team 1 makes one in the
      // finished week. The finished week has to win.
      transactions: [
        txn(1, 1),
        txn(2, 2), txn(2, 2), txn(2, 2), txn(2, 2), txn(2, 2),
      ],
    })
    const moves = out.find((r) => r.key === 'most_moves_week')
    expect(moves?.value).toBe(1)
    expect(moves?.holders[0].teamId).toBe(1)
    expect(moves?.holders[0].week).toBe(1)
  })

  it('needs EVERY matchup in a week to be final, not just one', () => {
    const matchups: RecordMatchup[] = [
      g(1, 1, 2, 100, 90),
      g(1, 3, 4, 0, 0, 'LIVE'),
    ]
    const out = computeRecords({
      matchups,
      transactions: [{ year: 2026, week: 1, seasonTeamId: 1, kind: 'WAIVER', acquiredPlayerIds: [] }],
    })
    expect(out.find((r) => r.key === 'most_moves_week')).toBeUndefined()
  })
})

describe('records that measure a distance carry their direction', () => {
  const pw = (
    espnPlayerId: number, name: string, actual: number, projected: number,
    isStarter = true, lineupSlotId = 0,
  ) => ({
    year: 2026, week: 1, seasonTeamId: 1, espnPlayerId, name,
    position: 'QB', nflTeam: 'CHI', isStarter, lineupSlotId,
    eligibleSlots: [0], actualPoints: actual, projectedPoints: projected,
  })

  const out = computeRecords({
    matchups: [g(1, 1, 2, 100, 90)],
    players: [
      pw(1, 'Over Achiever', 40, 20),
      pw(2, 'Under Achiever', 2, 22),
      pw(3, 'Bench Hero', 38, 12, false, 20),
      pw(4, 'On IR', 99, 10, false, 21),
    ],
  })
  const byKey = new Map(out.map((r) => [r.key, r]))

  it('labels over- and under-performance with a sign', () => {
    // Both are stored as magnitudes; the sign is what tells them apart.
    expect(byKey.get('biggest_overperformance')?.value).toBeCloseTo(20)
    expect(byKey.get('biggest_overperformance')?.signed).toBe('+')
    expect(byKey.get('biggest_underperformance')?.value).toBeCloseTo(20)
    expect(byKey.get('biggest_underperformance')?.signed).toBe('-')
  })

  it('finds the best game nobody started, and ignores IR', () => {
    // A player on IR could not legally be started, so leaving him there was
    // not a decision — the same line The Understudy draws.
    const bench = byKey.get('best_bench_game')
    expect(bench?.value).toBeCloseTo(38)
    expect(bench?.holders[0].player?.name).toBe('Bench Hero')
  })

  it('gives the schedule records a unit, so the number is not read as a score', () => {
    const r = computeRecords({ matchups: [g(1, 1, 2, 100, 90)] })
    expect(r.find((x) => x.key === 'toughest_schedule')?.valueSuffix).toBe('avg opp. score')
  })
})

describe('manager records judge the decision, not the outcome', () => {
  const base = {
    year: 2026, week: 1, seasonTeamId: 1, position: 'WR', nflTeam: 'BUF',
    eligibleSlots: [4], lineupSlotId: 4, projectedPoints: 5,
  }

  it('counts a waiver pickup only when it was actually started', () => {
    // A pickup left on the bench influenced nothing. That is The Waiver Wire
    // Wizard's punchline, not a record about changing a result.
    const out = computeRecords({
      matchups: [g(1, 1, 2, 100, 90)],
      players: [
        { ...base, espnPlayerId: 1, name: 'Started Pickup', isStarter: true, actualPoints: 12 },
        { ...base, espnPlayerId: 2, name: 'Benched Pickup', isStarter: false, lineupSlotId: 20, actualPoints: 40 },
      ],
      transactions: [
        { year: 2026, week: 1, seasonTeamId: 1, kind: 'WAIVER', acquiredPlayerIds: [1, 2] },
      ],
    })
    const r = out.find((x) => x.key === 'best_waiver_pickup')
    expect(r?.value).toBeCloseTo(12)
    expect(r?.holders[0].player?.name).toBe('Started Pickup')
  })

  it('rates a draft pick against its projection, not its round', () => {
    // The old version needed a round cutoff: steals had to come late, busts had
    // to be first-rounders. That measures draft POSITION. This measures how far
    // from expectation the pick landed, which is the actual question.
    const out = computeRecords({
      matchups: [g(1, 1, 2, 100, 90)],
      players: [
        { ...base, espnPlayerId: 1, name: 'Late Bloomer', isStarter: true, actualPoints: 40, projectedPoints: 10 },
        { ...base, espnPlayerId: 2, seasonTeamId: 2, name: 'Early Flop', isStarter: true, actualPoints: 1, projectedPoints: 25 },
      ],
      draftPicks: [
        { year: 2026, seasonTeamId: 1, espnPlayerId: 1, name: 'Late Bloomer', position: 'WR', nflTeam: 'BUF', overall: 140 },
        { year: 2026, seasonTeamId: 2, espnPlayerId: 2, name: 'Early Flop', position: 'WR', nflTeam: 'BUF', overall: 2 },
      ],
    })
    const steal = out.find((x) => x.key === 'draft_steal')
    const bust = out.find((x) => x.key === 'draft_bust')
    expect(steal?.value).toBeCloseTo(30)
    expect(steal?.signed).toBe('+')
    expect(steal?.holders[0].player?.name).toBe('Late Bloomer')
    expect(bust?.value).toBeCloseTo(24)
    expect(bust?.signed).toBe('-')
    expect(bust?.holders[0].player?.name).toBe('Early Flop')
  })

  it('ignores a drafted player who never played for the team that drafted him', () => {
    // Dropped before kickoff or traded away. Judging the draft on somebody
    // else's roster measures the wrong manager.
    const out = computeRecords({
      matchups: [g(1, 1, 2, 100, 90)],
      players: [],
      draftPicks: [
        { year: 2026, seasonTeamId: 1, espnPlayerId: 9, name: 'Never Played', position: 'WR', nflTeam: 'BUF', overall: 1 },
      ],
    })
    expect(out.find((x) => x.key === 'draft_steal')).toBeUndefined()
    expect(out.find((x) => x.key === 'draft_bust')).toBeUndefined()
  })
})

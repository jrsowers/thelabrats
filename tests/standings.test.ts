/**
 * Standings engine tests (§42). This is a high-consequence calculation — an
 * award or playoff seed built on a wrong record is a failed feature (§66).
 */
import { describe, it, expect } from 'vitest'
import {
  computeStandings, computeMovement, latestCompletedWeek, computePlayoffStatus,
  type StandingsInput, type TeamMeta,
} from '@/lib/standings/compute'

const teams: TeamMeta[] = [1, 2, 3, 4].map((id) => ({ seasonTeamId: id, name: `Team ${id}` }))

const game = (
  week: number, home: number, away: number, hs: number, as: number, status = 'FINAL',
): StandingsInput => ({
  week, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, status,
})

describe('computeStandings', () => {
  it('lists every team even before a game is played', () => {
    const rows = computeStandings([], teams, 1)
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => r.gamesPlayed === 0 && r.streak === null)).toBe(true)
  })

  it('records wins, losses and points on both sides of a result', () => {
    const rows = computeStandings([game(1, 1, 2, 120, 100)], teams, 1)
    const t1 = rows.find((r) => r.seasonTeamId === 1)!
    const t2 = rows.find((r) => r.seasonTeamId === 2)!
    expect([t1.wins, t1.losses, t1.pointsFor, t1.pointsAgainst]).toEqual([1, 0, 120, 100])
    expect([t2.wins, t2.losses, t2.pointsFor, t2.pointsAgainst]).toEqual([0, 1, 100, 120])
  })

  it('counts a tie as half a win', () => {
    const rows = computeStandings([game(1, 1, 2, 110, 110)], teams, 1)
    const t1 = rows.find((r) => r.seasonTeamId === 1)!
    expect(t1.ties).toBe(1)
    expect(t1.winPct).toBe(0.5)
  })

  it('ignores games that are not final', () => {
    const rows = computeStandings([game(1, 1, 2, 120, 100, 'LIVE')], teams, 1)
    expect(rows.every((r) => r.gamesPlayed === 0)).toBe(true)
  })

  it('ignores games beyond the requested week', () => {
    const games = [game(1, 1, 2, 120, 100), game(2, 1, 3, 90, 130)]
    const t1 = computeStandings(games, teams, 1).find((r) => r.seasonTeamId === 1)!
    expect([t1.wins, t1.losses]).toEqual([1, 0])
  })

  it('breaks a record tie on points for when they have not met', () => {
    // Both 1-0 and have not played each other, so points for decides.
    const rows = computeStandings([game(1, 1, 2, 101, 100), game(1, 3, 4, 150, 100)], teams, 1)
    expect(rows[0].seasonTeamId).toBe(3)
    expect(rows[1].seasonTeamId).toBe(1)
    expect(rows[0].tiebreakNote).toMatch(/Points for/)
  })

  it('is deterministic when record and points are identical', () => {
    const games = [game(1, 1, 2, 120, 100), game(1, 3, 4, 120, 100)]
    const a = computeStandings(games, teams, 1).map((r) => r.seasonTeamId)
    const b = computeStandings(games, teams, 1).map((r) => r.seasonTeamId)
    expect(a).toEqual(b)
  })

  it('counts only the current run for a streak', () => {
    const games = [
      game(1, 1, 2, 120, 100), // W
      game(2, 1, 3, 90, 130),  // L
      game(3, 1, 4, 140, 100), // W
      game(4, 1, 2, 130, 100), // W
    ]
    const t1 = computeStandings(games, teams, 4).find((r) => r.seasonTeamId === 1)!
    expect(t1.streak).toEqual({ type: 'W', count: 2 })
  })

  it('assigns ranks 1..n with no gaps or duplicates', () => {
    const rows = computeStandings([game(1, 1, 2, 120, 100), game(1, 3, 4, 130, 90)], teams, 1)
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4])
  })
})

describe('head-to-head tiebreaker', () => {
  it('beats points for in a two-way tie', () => {
    // Both finish 1-1. Team 2 scored far more overall, but team 1 won the
    // head-to-head — head-to-head must win, or the league's stated rule is wrong.
    const games = [
      game(1, 1, 2, 100, 90),   // team 1 beats team 2
      game(2, 1, 3, 80, 200),   // team 1 loses badly
      game(2, 2, 4, 300, 100),  // team 2 wins big, inflating its points for
    ]
    const rows = computeStandings(games, teams, 2)
    const t1 = rows.findIndex((r) => r.seasonTeamId === 1)
    const t2 = rows.findIndex((r) => r.seasonTeamId === 2)
    const p1 = rows.find((r) => r.seasonTeamId === 1)!
    const p2 = rows.find((r) => r.seasonTeamId === 2)!

    expect(p1.winPct).toBe(p2.winPct)
    expect(p2.pointsFor).toBeGreaterThan(p1.pointsFor)
    expect(t1).toBeLessThan(t2)
    expect(p1.tiebreakNote).toMatch(/Head-to-head/)
  })

  it('uses a mini round-robin for a three-way tie', () => {
    // Teams 1, 2 and 3 all finish 2-1 having each played the others.
    // Inside the group: 1 goes 2-0, 2 goes 1-1, 3 goes 0-2.
    const games = [
      game(1, 1, 2, 120, 100), // 1 beats 2
      game(2, 1, 3, 120, 100), // 1 beats 3
      game(3, 2, 3, 120, 100), // 2 beats 3
      game(4, 1, 4, 80, 150),  // everyone drops one outside the group
      game(5, 2, 4, 80, 150),
      game(6, 3, 4, 80, 150),
    ]
    const order = computeStandings(games, teams, 6)
      .filter((r) => r.seasonTeamId !== 4)
      .map((r) => r.seasonTeamId)
    expect(order).toEqual([1, 2, 3])
  })

  it('falls back to points for when tied teams never met', () => {
    const games = [game(1, 1, 3, 150, 100), game(1, 2, 4, 120, 100)]
    const rows = computeStandings(games, teams, 1)
    expect(rows[0].seasonTeamId).toBe(1) // 150 PF beats 120 PF
    expect(rows[0].tiebreakNote).toMatch(/Points for/)
  })
})

describe('computePlayoffStatus', () => {
  const big: TeamMeta[] = Array.from({ length: 6 }, (_, i) => ({
    seasonTeamId: i + 1, name: `Team ${i + 1}`,
  }))

  it('clinches nobody while everyone can still catch up', () => {
    const rows = computeStandings([game(1, 1, 2, 120, 100)], big, 1)
    const status = computePlayoffStatus(rows, 13, 1, 4)
    expect([...status.values()].some((s) => s === 'CLINCHED')).toBe(false)
  })

  it('clinches when no rival can reach the team even by winning out', () => {
    // Final week played: 4 spots, 6 teams, nothing left to play.
    const games = [
      game(1, 1, 2, 120, 100), game(2, 1, 3, 120, 100), game(3, 1, 4, 120, 100),
      game(1, 5, 6, 120, 100),
    ]
    const rows = computeStandings(games, big, 3)
    const status = computePlayoffStatus(rows, 3, 3, 4) // season over
    expect(status.get(1)).toBe('CLINCHED')
  })

  it('never claims a clinch that is not certain', () => {
    // Plenty of season left — a 1-0 start cannot guarantee anything.
    const rows = computeStandings([game(1, 1, 2, 120, 100)], big, 1)
    const status = computePlayoffStatus(rows, 13, 1, 2)
    expect(status.get(1)).not.toBe('CLINCHED')
  })

  it('eliminates a team that cannot reach the cut', () => {
    // Team 2 loses out with no games left; four rivals are already ahead.
    const games = [
      game(1, 1, 2, 120, 100), game(2, 3, 2, 120, 100),
      game(3, 4, 2, 120, 100), game(1, 5, 6, 120, 100),
      game(2, 5, 6, 120, 100), game(3, 5, 6, 120, 100),
    ]
    const rows = computeStandings(games, big, 3)
    const status = computePlayoffStatus(rows, 3, 3, 2)
    expect(status.get(2)).toBe('ELIMINATED')
  })

  it('resolves every team exactly once the season is over', () => {
    // Nothing left to play: the table is final, so rank alone decides. Teams
    // tied on wins must still resolve — the tiebreaker already ordered them.
    const games = [
      game(1, 1, 2, 120, 100), game(1, 3, 4, 120, 100), game(1, 5, 6, 120, 100),
      game(2, 1, 3, 120, 100), game(2, 2, 4, 120, 100), game(2, 5, 6, 120, 100),
    ]
    const rows = computeStandings(games, big, 2)
    const status = computePlayoffStatus(rows, 2, 2, 3) // season complete
    expect([...status.values()].filter((s) => s === 'CLINCHED')).toHaveLength(3)
    expect([...status.values()].filter((s) => s === 'ELIMINATED')).toHaveLength(3)
    expect([...status.values()]).not.toContain('BUBBLE')
    // The clinched three must be exactly the top three ranks.
    expect(rows.slice(0, 3).every((r) => status.get(r.seasonTeamId) === 'CLINCHED')).toBe(true)
  })

  it('marks teams below the line but still alive as bubble', () => {
    const games = [game(1, 1, 2, 120, 100), game(1, 3, 4, 120, 100)]
    const rows = computeStandings(games, big, 1)
    const status = computePlayoffStatus(rows, 13, 1, 2)
    expect([...status.values()]).toContain('BUBBLE')
  })
})

describe('computeMovement', () => {
  it('returns nothing in week 1 — there is no prior week', () => {
    expect(computeMovement([game(1, 1, 2, 120, 100)], teams, 1).size).toBe(0)
  })

  it('reports a climb as positive and a slide as negative', () => {
    const games = [
      // Week 1: team 2 and 4 win, so 1 and 3 sit at the bottom.
      game(1, 1, 2, 100, 120),
      game(1, 3, 4, 100, 130),
      // Week 2: team 1 wins big, team 4 loses.
      game(2, 1, 4, 200, 100),
      game(2, 3, 2, 100, 110),
    ]
    const move = computeMovement(games, teams, 2)
    const after = computeStandings(games, teams, 2)
    const before = computeStandings(games, teams, 1)

    for (const row of after) {
      const priorRank = before.find((r) => r.seasonTeamId === row.seasonTeamId)!.rank
      expect(move.get(row.seasonTeamId)).toBe(priorRank - row.rank)
    }
    // Movement across the table must net to zero — every climb is someone's slide.
    expect([...move.values()].reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('reports nothing when the prior week had no completed games', () => {
    const games = [game(1, 1, 2, 120, 100, 'SCHEDULED'), game(2, 1, 2, 120, 100)]
    expect(computeMovement(games, teams, 2).size).toBe(0)
  })
})

describe('latestCompletedWeek', () => {
  it('is 0 before anything is final', () => {
    expect(latestCompletedWeek([game(1, 1, 2, 0, 0, 'SCHEDULED')])).toBe(0)
  })
  it('ignores live games in progress', () => {
    expect(latestCompletedWeek([game(1, 1, 2, 120, 100), game(2, 1, 3, 50, 40, 'LIVE')])).toBe(1)
  })
})

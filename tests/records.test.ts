/**
 * Record book tests (§24.5). The rule that matters most: a record with no
 * qualifying game is OMITTED, not returned as zero — an empty record book must
 * look empty, not like a league where nobody has ever scored.
 */
import { describe, it, expect } from 'vitest'
import { computeRecords, computeCareers, type RecordMatchup } from '@/lib/records/compute'

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

const byKey = (m: RecordMatchup[]) => new Map(computeRecords(m).map((r) => [r.key, r]))

describe('computeRecords', () => {
  it('returns nothing before a game has been played', () => {
    expect(computeRecords([])).toEqual([])
    expect(computeRecords([g(1, 1, 2, 0, 0, 'SCHEDULED')])).toEqual([])
  })

  it('ignores games that are not final', () => {
    expect(computeRecords([g(1, 1, 2, 200, 100, 'LIVE')])).toEqual([])
  })

  it('finds the highest and lowest weekly scores', () => {
    const r = byKey(season)
    expect(r.get('highest_score')?.value).toBeCloseTo(178.40)
    expect(r.get('highest_score')?.teamId).toBe(1)
    expect(r.get('lowest_score')?.value).toBeCloseTo(61.20)
  })

  it('finds the highest losing and lowest winning scores', () => {
    const r = byKey(season)
    // Losses: 121.70 (t2), 87.50 (t4), 95.00 (t1), 61.20 (t2).
    // The best of them is team 2's 121.70 in the blowout — not team 1's 95.00.
    expect(r.get('highest_losing')?.value).toBeCloseTo(121.70)
    expect(r.get('highest_losing')?.teamId).toBe(2)
    // Wins: 70.10 (t4), 88.00 (t3), 140.00 (t3), 178.40 (t1).
    expect(r.get('lowest_winning')?.value).toBeCloseTo(70.10)
    expect(r.get('lowest_winning')?.teamId).toBe(4)
  })

  it('finds margin records at matchup level, with both teams', () => {
    const r = byKey(season)
    expect(r.get('largest_margin')?.value).toBeCloseTo(56.70)
    expect(r.get('closest_win')?.value).toBeCloseTo(0.50)
    expect(r.get('closest_win')?.teamIds).toHaveLength(2)
  })

  it('finds combined-score records', () => {
    const r = byKey(season)
    expect(r.get('highest_combined')?.value).toBeCloseTo(300.10)
    expect(r.get('lowest_combined')?.value).toBeCloseTo(131.30)
  })

  it('carries context on every record, never a bare number', () => {
    for (const rec of computeRecords(season)) {
      expect(rec.context.length).toBeGreaterThan(0)
      expect(rec.context).not.toMatch(/undefined|NaN/)
      expect(rec.week).toBeGreaterThan(0)
      expect(rec.year).toBeGreaterThan(2000)
    }
  })

  it('omits margin records when every game was a tie', () => {
    const ties = [g(1, 1, 2, 100, 100)]
    const r = byKey(ties)
    expect(r.has('largest_margin')).toBe(false)
    expect(r.has('closest_win')).toBe(false)
    // A tie is neither a win nor a loss, so these are omitted too.
    expect(r.has('highest_losing')).toBe(false)
    expect(r.has('lowest_winning')).toBe(false)
    // But the scores themselves still count.
    expect(r.has('highest_score')).toBe(true)
  })

  it('spans multiple seasons', () => {
    const multi = [...season, g(5, 1, 2, 210.00, 90.00, 'FINAL', 2027)]
    const r = byKey(multi)
    expect(r.get('highest_score')?.year).toBe(2027)
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

/**
 * Fixture tests for the ESPN normalization layer (spec §42).
 *
 * Fixtures are sanitized captures from the real league, so structural facts
 * (12 teams, 13 matchup periods, no FAAB, slot layout) are genuine while
 * identities are synthetic. When ESPN changes a payload, these fail first —
 * which is the whole point of the adapter boundary.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { leagueResponseSchema } from '@/lib/espn/schemas'
import {
  toLeagueSettings, toLeagueStatus, toManagers, toTeams, toMatchups,
  isStarterSlot, lineupSlotLabel, proTeamAbbrev,
} from '@/lib/espn/transforms'
import { LINEUP_SLOT } from '@/lib/espn/constants'

const load = (f: string) =>
  leagueResponseSchema.parse(JSON.parse(readFileSync(`fixtures/${f}`, 'utf8')))

const league = load('league-settings-teams.json')
const matchupScore = load('mMatchupScore.json')

describe('schema validation', () => {
  it('accepts every captured view', () => {
    for (const f of [
      'league-settings-teams.json', 'mMatchupScore.json', 'mScoreboard.json',
      'mRoster.json', 'mTransactions2.json', 'mBoxscore.json',
      'mLiveScoring.json', 'mStandings.json', 'mDraftDetail.json',
    ]) {
      expect(() => load(f), `${f} should parse`).not.toThrow()
    }
  })
})

describe('schedule source selection', () => {
  // Five views each return 78 schedule entries, but only one is complete.
  // These tests pin that finding so a future change is caught rather than
  // silently importing a half-populated season.
  const VIEWS_WITH_PARTIAL_SCHEDULES = [
    { file: 'mScoreboard.json', missing: 'matchupPeriodId' },
    { file: 'mStandings.json', missing: 'id' },
    { file: 'mLiveScoring.json', missing: 'id' },
  ]

  it('every view returns 78 raw entries', () => {
    for (const f of ['mMatchupScore.json', 'mBoxscore.json', 'mScoreboard.json',
                     'mStandings.json', 'mLiveScoring.json']) {
      const raw = JSON.parse(readFileSync(`fixtures/${f}`, 'utf8'))
      expect(raw.schedule, f).toHaveLength(78)
    }
  })

  it('partial views parse but yield no usable matchups', () => {
    for (const { file, missing } of VIEWS_WITH_PARTIAL_SCHEDULES) {
      const raw = JSON.parse(readFileSync(`fixtures/${file}`, 'utf8'))
      expect(raw.schedule.every((m: object) => !(missing in m)), `${file} lacks ${missing}`).toBe(true)
      // Parses without throwing, but drops rather than guessing a week.
      expect(toMatchups(load(file)), file).toHaveLength(0)
    }
  })

  it('mMatchupScore is the one complete source', () => {
    expect(toMatchups(load('mMatchupScore.json'))).toHaveLength(78)
  })
})

describe('toLeagueSettings', () => {
  const s = toLeagueSettings(league, 2026)

  it('reads league shape from ESPN rather than assuming it', () => {
    expect(s.teamCount).toBe(12)
    expect(s.regularSeasonWeeks).toBe(13)
    expect(s.playoffTeamCount).toBe(6)
    expect(s.finalScoringPeriod).toBe(17)
    expect(s.seedingRule).toBe('H2H_RECORD')
  })

  it('treats a single ESPN division as no divisions', () => {
    expect(s.divisions).toHaveLength(1)
    expect(s.hasDivisions).toBe(false)
  })

  it('reports FAAB off even though a budget value is present', () => {
    // Regression guard: acquisitionBudget is 100 here but FAAB is disabled.
    // Trusting the number instead of the boolean would resurrect FAAB awards.
    expect(s.usesFaab).toBe(false)
    expect(s.faabBudget).toBeNull()
    expect(s.acquisitionType).toBe('WAIVERS_TRADITIONAL')
  })

  it('captures the lineup slots the optimizer depends on', () => {
    expect(s.lineupSlotCounts).toEqual({ 0: 1, 2: 2, 4: 2, 6: 1, 7: 1, 16: 1, 17: 1, 20: 5, 21: 1, 23: 1 })
    const starters = Object.entries(s.lineupSlotCounts)
      .filter(([slot]) => isStarterSlot(Number(slot)))
      .reduce((n, [, c]) => n + c, 0)
    expect(starters).toBe(10)
  })

  it('reads the draft as scheduled but not yet held', () => {
    expect(s.draft.type).toBe('SNAKE')
    expect(s.draft.completed).toBe(false)
    expect(s.draft.scheduledAt).toMatch(/^2026-09-03T/)
  })
})

describe('toLeagueStatus', () => {
  it('reports no prior seasons for this league', () => {
    expect(toLeagueStatus(league).previousSeasons).toEqual([])
  })
})

describe('toTeams / toManagers', () => {
  it('returns all twelve franchises with owner GUIDs', () => {
    const teams = toTeams(league)
    expect(teams).toHaveLength(12)
    for (const t of teams) {
      expect(t.name).not.toBe('')
      expect(t.ownerIds.length).toBeGreaterThan(0)
    }
  })

  it('links every team owner to a known member', () => {
    // This link is what makes cross-season franchise identity possible (§25).
    const memberIds = new Set(toManagers(league).map((m) => m.espnMemberId))
    expect(memberIds.size).toBe(12)
    for (const t of toTeams(league)) {
      for (const owner of t.ownerIds) expect(memberIds.has(owner)).toBe(true)
    }
  })
})

describe('toMatchups', () => {
  const matchups = toMatchups(matchupScore)

  it('sources the full schedule from mMatchupScore', () => {
    // mSchedule returns nothing — see ESPN-API.md. If this drops to 0, that
    // view changed and ingestion is silently importing an empty season.
    expect(matchups).toHaveLength(78)
  })

  it('covers 13 periods of 6 matchups', () => {
    const byPeriod = new Map<number, number>()
    for (const m of matchups) byPeriod.set(m.matchupPeriod, (byPeriod.get(m.matchupPeriod) ?? 0) + 1)
    expect(byPeriod.size).toBe(13)
    for (const [, count] of byPeriod) expect(count).toBe(6)
  })

  it('marks an unplayed season as scheduled with no winner', () => {
    for (const m of matchups) {
      expect(m.status).toBe('SCHEDULED')
      expect(m.winnerTeamId).toBeNull()
      expect(m.isPlayoff).toBe(false)
    }
  })

  it('gives every team exactly one opponent per period', () => {
    const week1 = matchups.filter((m) => m.matchupPeriod === 1)
    const ids = week1.flatMap((m) => [m.homeTeamId, m.awayTeamId])
    expect(new Set(ids).size).toBe(12)
  })
})

describe('id maps', () => {
  it('labels the slots this league uses', () => {
    expect(lineupSlotLabel(LINEUP_SLOT.BENCH)).toBe('BE')
    expect(lineupSlotLabel(LINEUP_SLOT.IR)).toBe('IR')
    expect(lineupSlotLabel(LINEUP_SLOT.FLEX)).toBe('FLEX')
    expect(lineupSlotLabel(LINEUP_SLOT.OP)).toBe('OP')
  })

  it('treats bench and IR as non-starters', () => {
    expect(isStarterSlot(LINEUP_SLOT.BENCH)).toBe(false)
    expect(isStarterSlot(LINEUP_SLOT.IR)).toBe(false)
    expect(isStarterSlot(LINEUP_SLOT.FLEX)).toBe(true)
    expect(isStarterSlot(LINEUP_SLOT.OP)).toBe(true)
  })

  it('degrades gracefully on unknown pro team ids', () => {
    expect(proTeamAbbrev(33)).toBe('BAL')
    expect(proTeamAbbrev(31)).toBe('UNK') // 31/32 are gaps, not teams
  })
})

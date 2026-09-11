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
  toLeagueSettings, toLeagueStatus, toManagers, toTeams, toMatchups, toEspnStandings,
  toPlayerWeekScores, isStarterSlot, lineupSlotLabel, proTeamAbbrev,
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
    // IR went from one slot to two when the commissioner widened it before
    // week 1. The fixture is a live capture, so it moves when the league does.
    expect(s.lineupSlotCounts).toEqual({ 0: 1, 2: 2, 4: 2, 6: 1, 7: 1, 16: 1, 17: 1, 20: 5, 21: 2, 23: 1 })
    const starters = Object.entries(s.lineupSlotCounts)
      .filter(([slot]) => isStarterSlot(Number(slot)))
      .reduce((n, [, c]) => n + c, 0)
    expect(starters).toBe(10)
  })

  it('reads the snake draft as held on its scheduled date', () => {
    expect(s.draft.type).toBe('SNAKE')
    expect(s.draft.completed).toBe(true)
    expect(s.draft.scheduledAt).toMatch(/^2026-09-03T/)
  })

  it('reads the playoff round lengths rather than assuming one week each', () => {
    // The championship spans two weeks in this league. Defaulting to one put
    // the final on week 16 when it actually ends in week 17.
    expect(s.playoffRoundLengths).toEqual({ 1: 1, 2: 1, 3: 2 })
    expect(s.playoffReseed).toBe(false)
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

describe('toEspnStandings', () => {
  // Requires BOTH mTeam and mStandings — the fixture is captured with both.
  const rows = toEspnStandings(league)

  it('returns one row per team', () => {
    expect(rows).toHaveLength(12)
    expect(new Set(rows.map((r) => r.espnTeamId)).size).toBe(12)
  })

  it('reads the overall record, not the home or away split', () => {
    const t = league.teams![0]
    const r = rows[0]
    expect(r.wins).toBe(t.record!.overall!.wins)
    expect(r.pointsFor).toBe(t.record!.overall!.pointsFor)
  })

  it("carries ESPN's seed through untouched, garbage preseason value and all", () => {
    // Preseason ESPN fills playoffSeed with reverse draft order. Deciding
    // whether to trust it belongs to the reader, not the parser.
    expect(rows.every((r) => typeof r.playoffSeed === 'number')).toBe(true)
    expect(new Set(rows.map((r) => r.playoffSeed)).size).toBe(12)
  })

  it("reads the simulation that only mStandings carries", () => {
    expect(rows.every((r) => r.playoffOdds !== null)).toBe(true)
    expect(rows.every((r) => r.playoffOdds! >= 0 && r.playoffOdds! <= 1)).toBe(true)
    expect(rows.every((r) => r.projectedWins !== null && r.projectedLosses !== null)).toBe(true)
  })

  it("turns ESPN's 'NONE' streak into no streak", () => {
    expect(rows.every((r) => r.streakType === null)).toBe(true)
  })

  it('treats a zero elimination week and final rank as absent', () => {
    // ESPN writes 0, not null, for "has not happened". Storing the 0 would
    // read as "eliminated in week zero, finished first".
    expect(rows.every((r) => r.eliminationWeek === null)).toBe(true)
    expect(rows.every((r) => r.finalRank === null)).toBe(true)
    expect(rows.every((r) => r.eliminated === false)).toBe(true)
  })
})

describe('toMatchups — live scoring', () => {
  // Captured 2026-09-11, mid-week-1: two NFL games final, the rest not played.
  const boxscore = load('mBoxscore.json')
  const week1 = toMatchups(boxscore).filter((m) => m.week === 1)

  it('reads a live score that ESPN has not finalized', () => {
    // The regression. `totalPoints` reads 0.0 for every team until ESPN closes
    // the scoring period, which left the scoreboard at 0-0 for two days.
    const raw = (boxscore.schedule ?? []).filter((m) => m.matchupPeriodId === 1)
    expect(raw.every((m) => (m.home?.totalPoints ?? 0) === 0)).toBe(true)
    expect(week1.some((m) => m.homeScore > 0 || m.awayScore > 0)).toBe(true)
  })

  it('marks a matchup with points on the board as LIVE, not SCHEDULED', () => {
    const scoring = week1.filter((m) => m.homeScore > 0 || m.awayScore > 0)
    expect(scoring.length).toBeGreaterThan(0)
    expect(scoring.every((m) => m.status === 'LIVE')).toBe(true)
  })

  it('agrees with the sum of that team’s starters', () => {
    // ESPN's live team total is its own starters-only sum, so the scoreboard
    // number and the boxscore beneath it can never disagree. Only the matchups
    // the fixture still carries rosters for can be checked — see
    // sanitize-fixtures.mjs for why the rest were stripped.
    const scored = toPlayerWeekScores(boxscore, 1)
    const withRosters = (boxscore.schedule ?? []).filter(
      (x) => x.matchupPeriodId === 1 && x.home?.rosterForCurrentScoringPeriod,
    )
    expect(withRosters.length).toBeGreaterThan(0)

    for (const m of withRosters) {
      const out = week1.find((w) => w.espnMatchupId === m.id)!
      const starters = scored
        .filter((p) => p.espnTeamId === m.home?.teamId && p.isStarter)
        .reduce((n, p) => n + (p.actualPoints ?? 0), 0)
      expect(out.homeScore).toBeCloseTo(starters, 2)
    }
  })
})

describe('toPlayerWeekScores', () => {
  const boxscore = load('mBoxscore.json')
  const rows = toPlayerWeekScores(boxscore, 1)

  it('returns every rostered player on both sides of each matchup', () => {
    // Two matchups in the trimmed fixture: four teams of fifteen or sixteen.
    expect(rows.length).toBeGreaterThanOrEqual(60)
    expect(new Set(rows.map((r) => r.espnTeamId)).size).toBe(4)
  })

  it('separates actual from projected rather than conflating them', () => {
    // THE trap (CLAUDE.md): both sit in the same stats array on the same
    // player, told apart only by statSourceId.
    const played = rows.filter((r) => r.actualPoints != null && r.actualPoints > 0)
    expect(played.length).toBeGreaterThan(0)
    expect(played.every((r) => r.actualPoints !== r.projectedPoints)).toBe(true)
  })

  it('leaves a player whose game has not started as null, not zero', () => {
    // Zero would mean "played and scored nothing". Collapsing the two hands
    // Nostradamus to whoever is projected highest and has not kicked off yet,
    // as the biggest miss of a week he has not played in.
    const unplayed = rows.filter((r) => r.actualPoints === null)
    expect(unplayed.length).toBeGreaterThan(0)
    expect(rows.some((r) => r.actualPoints !== null)).toBe(true)
    // A projection without a result is exactly the pre-kickoff state, and the
    // one carries no information about the other.
    expect(unplayed.some((r) => r.projectedPoints !== null)).toBe(true)
  })

  it('ignores stats belonging to another week', () => {
    // scoringPeriodId must filter as well as statSourceId; week 18 exists in
    // the same array and would otherwise be read as this week's result.
    expect(toPlayerWeekScores(boxscore, 18).every((r) => r.actualPoints === null)).toBe(true)
  })

  it('marks bench and IR as non-starters', () => {
    const bench = rows.filter((r) => r.lineupSlot === 'BE')
    expect(bench.length).toBeGreaterThan(0)
    expect(bench.every((r) => r.isStarter === false)).toBe(true)
    expect(rows.filter((r) => r.isStarter).every((r) => r.lineupSlot !== 'BE')).toBe(true)
  })

  it('carries slot eligibility, which the lineup optimizer needs', () => {
    // A superflex league's OP slot competes with QB for the same players, so
    // eligibility is the constraint set, not a nice-to-have.
    const qbs = rows.filter((r) => r.position === 'QB')
    expect(qbs.length).toBeGreaterThan(0)
    expect(qbs.every((r) => r.eligibleSlots.includes(0) && r.eligibleSlots.includes(7))).toBe(true)
  })
})

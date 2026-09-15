/**
 * Manager records: the decisions, not the scores.
 *
 * This is the half Yahoo structurally cannot do. Its record book measures what
 * happened to a roster; these measure what somebody *chose*, which is the only
 * part of fantasy football anybody is actually responsible for.
 *
 * All of it runs on machinery already built for Studs & Duds — the lineup
 * optimizer, the transaction log, the draft board and the awards table — so
 * none of these records can disagree with the award cards the league has
 * already read.
 */
import { optimalLineup, startingSeats, pointsLeftOnBench } from '@/lib/lineup/optimize'
import {
  bestOf, HIGH,
  type LeagueRecord, type RecordHolder, type RecordTone,
  type RecordScope, type RecordFormat,
} from './types'
import type { RecordPlayerWeek } from './player'

/** Bench (20) and IR (21) cannot be started. */
const NON_STARTER_SLOTS = new Set([20, 21])

export interface RecordTransaction {
  year: number
  week: number
  seasonTeamId: number
  kind: string
  acquiredPlayerIds: number[]
}

export interface RecordDraftPick {
  year: number
  seasonTeamId: number
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
  /** 1-based overall pick number. */
  overall: number
}

export interface RecordAward {
  year: number
  week: number
  seasonTeamId: number
  awardKey: string
  section: 'STUDS' | 'DUDS'
}

/** Roster shape per season, for the optimizer. */
export type SlotCountsByYear = Record<number, Record<string, number>>

const f = (n: number) => n.toFixed(2)

export function computeManagerRecords(
  players: RecordPlayerWeek[],
  transactions: RecordTransaction[],
  draftPicks: RecordDraftPick[],
  awards: RecordAward[],
  slotCountsByYear: SlotCountsByYear,
): LeagueRecord[] {
  const records: LeagueRecord[] = []

  const add = <T>(
    key: string, label: string, tone: RecordTone, scope: RecordScope,
    format: RecordFormat,
    result: { value: number; winners: { holder: RecordHolder }[] } | null,
  ) => {
    if (!result || result.winners.length === 0) return
    records.push({
      key, label, group: 'manager', scope, tone, format,
      value: result.value,
      holders: result.winners.map((w) => w.holder),
    })
  }

  // ------------------------------------------------ points left on the bench
  // The gap to the best LEGAL lineup, not the bench's total. Those are
  // different numbers and confusing them is the exact bug The Mastermind's
  // blurb shipped with — see DECISIONS.
  const byTeamWeek = new Map<string, RecordPlayerWeek[]>()
  for (const p of players) {
    const key = `${p.year}:${p.week}:${p.seasonTeamId}`
    if (!byTeamWeek.has(key)) byTeamWeek.set(key, [])
    byTeamWeek.get(key)!.push(p)
  }

  const gaps: { gap: number; holder: RecordHolder }[] = []
  for (const roster of byTeamWeek.values()) {
    const { year, week, seasonTeamId } = roster[0]
    const slotCounts = slotCountsByYear[year]
    // No roster shape means no seats, and a guessed lineup is worse than none.
    if (!slotCounts) continue
    const seats = startingSeats(slotCounts, NON_STARTER_SLOTS)
    if (seats.length === 0) continue

    // A missing stat line is ZERO here, because the week is over and a player
    // who did not play scored nothing. Everywhere else null means "not yet".
    const candidates = roster
      .filter((p) => p.lineupSlotId !== 21)
      .map((p) => ({
        espnPlayerId: p.espnPlayerId,
        name: p.name,
        points: p.actualPoints ?? 0,
        eligibleSlots: p.eligibleSlots,
      }))
    if (candidates.length === 0) continue

    const actual = roster
      .filter((p) => p.isStarter)
      .reduce((n, p) => n + (p.actualPoints ?? 0), 0)
    const optimal = optimalLineup(candidates, seats)
    const gap = pointsLeftOnBench(optimal.total, actual)
    if (gap <= 0) continue

    gaps.push({
      gap,
      holder: {
        teamId: seasonTeamId, year, week,
        context: `started ${f(actual)}, best was ${f(optimal.total)}`,
      },
    })
  }
  add('most_bench_points', 'Most Points Left on the Bench', 'bad', 'week', 'points',
    bestOf(gaps, (g) => g.gap, HIGH))

  // ------------------------------------------------------------ roster moves
  // DRAFT is excluded — 180 picks would win this forever. LINEUP swaps are
  // counted, because a start/sit decision is a roster move somebody made.
  const moves = transactions.filter((t) => t.kind !== 'DRAFT')

  const perWeek = new Map<string, { n: number; year: number; week: number; teamId: number }>()
  const perSeason = new Map<string, { n: number; year: number; teamId: number }>()
  for (const t of moves) {
    const wk = `${t.year}:${t.week}:${t.seasonTeamId}`
    perWeek.set(wk, { n: (perWeek.get(wk)?.n ?? 0) + 1, year: t.year, week: t.week, teamId: t.seasonTeamId })
    const sn = `${t.year}:${t.seasonTeamId}`
    perSeason.set(sn, { n: (perSeason.get(sn)?.n ?? 0) + 1, year: t.year, teamId: t.seasonTeamId })
  }

  add('most_moves_week', 'Most Roster Moves In One Week', 'bad', 'week', 'count',
    bestOf(
      [...perWeek.values()].map((v) => ({
        n: v.n,
        holder: { teamId: v.teamId, year: v.year, week: v.week, context: 'in a single week' },
      })),
      (r) => r.n, HIGH, 0,
    ))
  add('most_moves_season', 'Most Roster Moves In A Season', 'bad', 'season', 'count',
    bestOf(
      [...perSeason.values()].map((v) => ({
        n: v.n,
        holder: { teamId: v.teamId, year: v.year, week: null, context: 'across the season' },
      })),
      (r) => r.n, HIGH, 0,
    ))

  // ------------------------------------------------------- best waiver pickup
  // Points scored in the SAME week the player was acquired, by the team that
  // acquired him. Later weeks are just "this player was good"; the week of the
  // claim is the part that was a decision.
  const scoreOf = new Map<string, RecordPlayerWeek>()
  for (const p of players) scoreOf.set(`${p.year}:${p.week}:${p.seasonTeamId}:${p.espnPlayerId}`, p)

  // ⚠️ STARTED, NOT JUST ACQUIRED. A pickup left on the bench scored nothing
  // that mattered — it belongs to The Waiver Wire Wizard's punchline, not to a
  // record about influencing a matchup. James called this: the record is for
  // the claim that actually changed a result.
  const pickups: { pts: number; holder: RecordHolder }[] = []
  for (const t of moves) {
    if (t.kind !== 'WAIVER' && t.kind !== 'FREE_AGENT') continue
    for (const id of t.acquiredPlayerIds) {
      const row = scoreOf.get(`${t.year}:${t.week}:${t.seasonTeamId}:${id}`)
      if (!row || row.actualPoints == null || !row.isStarter) continue
      pickups.push({
        pts: Number(row.actualPoints),
        holder: {
          teamId: t.seasonTeamId, year: t.year, week: t.week,
          context: 'claimed and started the same week',
          player: {
            espnPlayerId: row.espnPlayerId, name: row.name,
            position: row.position, nflTeam: row.nflTeam,
          },
        },
      })
    }
  }
  add('best_waiver_pickup', 'Best Waiver Pickup', 'good', 'week', 'points',
    bestOf(pickups, (p) => p.pts, HIGH))

  // ------------------------------------------------------ draft steal and bust
  // MEASURED AGAINST PROJECTION, not against raw points.
  //
  // The first version used raw season points with a round filter — steals had
  // to come after round three, busts had to be first-rounders. That measures
  // draft POSITION, not judgement: a fourth-rounder who was always going to be
  // good is not a steal, and a first-rounder who got hurt in week 2 is not a
  // bust in any sense the drafter is responsible for.
  //
  // Points minus the season's own projections asks the right question — how
  // far from expectation did this pick land — and needs no arbitrary round
  // cutoff, so it works identically in a 10-team league or a 16-round one.
  const seasonActual = new Map<string, number>()
  const seasonProjected = new Map<string, number>()
  for (const p of players) {
    if (p.actualPoints == null) continue
    const key = `${p.year}:${p.seasonTeamId}:${p.espnPlayerId}`
    seasonActual.set(key, (seasonActual.get(key) ?? 0) + Number(p.actualPoints))
    seasonProjected.set(key, (seasonProjected.get(key) ?? 0) + Number(p.projectedPoints ?? 0))
  }

  const drafted = draftPicks
    .map((d) => {
      const key = `${d.year}:${d.seasonTeamId}:${d.espnPlayerId}`
      const actual = seasonActual.get(key)
      const projected = seasonProjected.get(key) ?? 0
      return { d, actual, projected }
    })
    // A pick with no scoring rows never played FOR THIS TEAM — dropped before
    // kickoff, or traded away. Judging the draft on somebody else's roster
    // would be measuring the wrong manager.
    .filter((r): r is typeof r & { actual: number } => r.actual != null)
    .map(({ d, actual, projected }) => ({
      delta: actual - projected,
      holder: {
        teamId: d.seasonTeamId, year: d.year, week: null,
        context: `pick ${d.overall} \u00b7 ${f(actual)} scored vs ${f(projected)} projected`,
        player: {
          espnPlayerId: d.espnPlayerId, name: d.name,
          position: d.position, nflTeam: d.nflTeam,
        },
      } satisfies RecordHolder,
    }))

  const steal = bestOf(drafted, (r) => r.delta, HIGH)
  if (steal && steal.value > 0) {
    records.push({
      key: 'draft_steal', label: 'Biggest Draft Steal', group: 'manager',
      scope: 'season', tone: 'good', format: 'points',
      value: steal.value, signed: '+', valueSuffix: 'vs projection',
      holders: steal.winners.map((w) => w.holder),
    })
  }
  const bust = bestOf(drafted, (r) => r.delta, (a, b) => a < b)
  if (bust && bust.value < 0) {
    records.push({
      key: 'draft_bust', label: 'Biggest Draft Bust', group: 'manager',
      scope: 'season', tone: 'bad', format: 'points',
      // Stored as a magnitude and labelled, like the other signed records.
      value: Math.abs(bust.value), signed: '-', valueSuffix: 'vs projection',
      holders: bust.winners.map((w) => w.holder),
    })
  }

  // ------------------------------------------------------------------ awards
  const tally = (section: 'STUDS' | 'DUDS') => {
    const counts = new Map<number, number>()
    for (const a of awards.filter((x) => x.section === section)) {
      counts.set(a.seasonTeamId, (counts.get(a.seasonTeamId) ?? 0) + 1)
    }
    return [...counts.entries()].map(([teamId, n]) => ({
      n,
      holder: { teamId, year: awards[0]?.year ?? 0, week: null, context: `${n} in total` },
    }))
  }
  add('most_studs', 'Most Studs Awards', 'good', 'season', 'count',
    bestOf(tally('STUDS'), (r) => r.n, HIGH, 0))
  add('most_duds', 'Most Duds Awards', 'bad', 'season', 'count',
    bestOf(tally('DUDS'), (r) => r.n, HIGH, 0))

  return records
}

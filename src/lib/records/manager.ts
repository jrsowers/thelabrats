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

  add('most_moves_week', 'Most Roster Moves, One Week', 'bad', 'week', 'count',
    bestOf(
      [...perWeek.values()].map((v) => ({
        n: v.n,
        holder: { teamId: v.teamId, year: v.year, week: v.week, context: 'in a single week' },
      })),
      (r) => r.n, HIGH, 0,
    ))
  add('most_moves_season', 'Most Roster Moves, One Season', 'bad', 'season', 'count',
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

  const pickups: { pts: number; holder: RecordHolder }[] = []
  for (const t of moves) {
    if (t.kind !== 'WAIVER' && t.kind !== 'FREE_AGENT') continue
    for (const id of t.acquiredPlayerIds) {
      const row = scoreOf.get(`${t.year}:${t.week}:${t.seasonTeamId}:${id}`)
      if (!row || row.actualPoints == null) continue
      pickups.push({
        pts: Number(row.actualPoints),
        holder: {
          teamId: t.seasonTeamId, year: t.year, week: t.week,
          context: `${row.isStarter ? 'started' : 'left on the bench'} the week of the claim`,
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
  // Season points against draft position. Comparing a pick to the average
  // return of its own slot needs more history than one season, so this uses the
  // simpler, honest version: total points produced for the team that drafted
  // him, contrasted with where he went.
  const seasonPointsFor = new Map<string, number>()
  for (const p of players) {
    if (p.actualPoints == null) continue
    const key = `${p.year}:${p.seasonTeamId}:${p.espnPlayerId}`
    seasonPointsFor.set(key, (seasonPointsFor.get(key) ?? 0) + Number(p.actualPoints))
  }

  const drafted = draftPicks
    .map((d) => ({
      d,
      pts: seasonPointsFor.get(`${d.year}:${d.seasonTeamId}:${d.espnPlayerId}`) ?? 0,
    }))
    .map(({ d, pts }) => ({
      d, pts,
      holder: {
        teamId: d.seasonTeamId, year: d.year, week: null,
        context: `pick ${d.overall} · ${f(pts)} pts`,
        player: {
          espnPlayerId: d.espnPlayerId, name: d.name,
          position: d.position, nflTeam: d.nflTeam,
        },
      } satisfies RecordHolder,
    }))

  if (drafted.length > 0) {
    // Steal: the most points from outside the first three rounds.
    const teamsPerRound = new Set(draftPicks.map((d) => d.seasonTeamId)).size || 12
    const lateCutoff = teamsPerRound * 3
    add('draft_steal', 'Biggest Draft Steal', 'good', 'season', 'points',
      bestOf(drafted.filter((r) => r.d.overall > lateCutoff), (r) => r.pts, HIGH))

    // Bust: the fewest points from a first-round pick. Deliberately NOT
    // "lowest scorer overall" — that is always somebody's last pick, which is
    // not a story about anybody's judgement.
    const firstRound = drafted.filter((r) => r.d.overall <= teamsPerRound)
    const bust = bestOf(firstRound, (r) => r.pts, (a, b) => a < b)
    if (bust && bust.winners.length > 0) {
      records.push({
        key: 'draft_bust', label: 'Biggest Draft Bust', group: 'manager',
        scope: 'season', tone: 'bad', format: 'points',
        value: bust.value,
        holders: bust.winners.map((w) => w.holder),
      })
    }
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

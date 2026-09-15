/**
 * Record book: the extremes of league history.
 *
 * Pure and derived from stored data, so records recalculate whenever the
 * underlying rows change — no stored record can drift out of sync with the
 * games it claims to describe (§24.5).
 *
 * Every record carries its context (§24.3). "178.4" alone is useless; "178.4,
 * Mr. Anderson, week 1 2026, opponent scored 148.9" is a record.
 *
 * Split by section rather than by data source, because that is how the page
 * reads and how somebody looking for a bug will look for it:
 *   team.ts     — scores, margins, streaks, schedules
 *   player.ts   — individual performances
 *   manager.ts  — decisions: benches, waivers, drafts, moves, awards
 */
export * from './types'
export * from './team'
export * from './player'
export * from './manager'

import type { LeagueRecord, RecordGroup } from './types'
import { computeTeamRecords, type RecordMatchup, type RecordSnapshot } from './team'
import { computePlayerRecords, POSITION_RECORD_KEYS, type RecordPlayerWeek } from './player'
import {
  computeManagerRecords,
  type RecordTransaction, type RecordDraftPick, type RecordAward, type SlotCountsByYear,
} from './manager'

export interface RecordInputs {
  matchups: RecordMatchup[]
  snapshots?: RecordSnapshot[]
  players?: RecordPlayerWeek[]
  transactions?: RecordTransaction[]
  draftPicks?: RecordDraftPick[]
  awards?: RecordAward[]
  slotCountsByYear?: SlotCountsByYear
}

/**
 * Every record the stored data can support.
 *
 * A record with no qualifying game is OMITTED rather than returned as zero. An
 * empty record book should look empty, not like a league where nobody has ever
 * scored — and a card reading "0.00" is indistinguishable from a real record
 * that happens to be zero.
 */
export function computeRecords(inputs: RecordInputs): LeagueRecord[] {
  // ⚠️ SETTLED WEEKS ONLY. Team records already ignore anything that is not
  // FINAL, but player lines and transactions exist from the moment a week
  // opens — so without this, "most roster moves in one week" quietly becomes a
  // live counter for the CURRENT week, changing hour by hour on a page whose
  // entire premise is settled history. A week counts only when every one of
  // its matchups is final.
  const played = new Map<string, { total: number; final: number }>()
  for (const m of inputs.matchups) {
    const key = `${m.year}:${m.week}`
    const acc = played.get(key) ?? { total: 0, final: 0 }
    acc.total += 1
    if (m.status === 'FINAL') acc.final += 1
    played.set(key, acc)
  }
  const settled = (year: number, week: number) => {
    const acc = played.get(`${year}:${week}`)
    return acc != null && acc.total > 0 && acc.total === acc.final
  }

  const players = (inputs.players ?? []).filter((p) => settled(p.year, p.week))
  const transactions = (inputs.transactions ?? []).filter((t) => settled(t.year, t.week))

  const team = computeTeamRecords(inputs.matchups, inputs.snapshots ?? [])
  const player = computePlayerRecords(players)
  const manager = computeManagerRecords(
    players,
    transactions,
    // Draft picks are season-scope and settle at the draft, not weekly. Their
    // POINTS come from `players`, which is already filtered, so a steal grows
    // as the season does rather than counting an in-progress week.
    inputs.draftPicks ?? [],
    inputs.awards ?? [],
    inputs.slotCountsByYear ?? {},
  )
  return [...team, ...player, ...manager]
}

export const recordsInGroup = (records: LeagueRecord[], group: RecordGroup) =>
  records.filter((r) => r.group === group && !POSITION_RECORD_KEYS.includes(r.key))

/** The per-position bests, in display order, as their own strip. */
export const positionRecords = (records: LeagueRecord[]) =>
  POSITION_RECORD_KEYS
    .map((key) => records.find((r) => r.key === key))
    .filter((r): r is LeagueRecord => r != null)

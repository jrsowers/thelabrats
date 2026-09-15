/**
 * Player records: the best and worst single performances in league history.
 *
 * ⚠️ STARTERS ONLY, EVERYWHERE. A 40-point game on somebody's bench is a story
 * about a lineup decision, not a league record — it belongs to The Understudy
 * over on Studs & Duds. "Best ever quarterback game" has to mean a game that
 * actually counted, or the record book is measuring a different sport.
 *
 * ⚠️ `actualPoints` NULL MEANS "HAS NOT PLAYED", NOT ZERO. Treating null as 0
 * would hand every "worst performance" record to whoever is on a bye.
 */
import {
  bestOf, HIGH, LOW,
  type LeagueRecord, type RecordHolder, type RecordTone,
} from './types'

export interface RecordPlayerWeek {
  year: number
  week: number
  seasonTeamId: number
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
  isStarter: boolean
  /** ESPN slot occupied. 21 is IR. */
  lineupSlotId: number
  /** The optimizer's constraint set. NOT derivable from position — a QB lists
   *  the superflex OP slot too. Used by the manager records, not here. */
  eligibleSlots: number[]
  actualPoints: number | null
  projectedPoints: number | null
}

const f = (n: number) => n.toFixed(2)

/** Positions that get their own all-time card. Order is the display order. */
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST'] as const

export function computePlayerRecords(rows: RecordPlayerWeek[]): LeagueRecord[] {
  const started = rows.filter((r) => r.isStarter && r.actualPoints != null)
  if (started.length === 0) return []

  const records: LeagueRecord[] = []

  const entry = (r: RecordPlayerWeek, context: string) => ({
    r,
    holder: {
      teamId: r.seasonTeamId, year: r.year, week: r.week, context,
      player: {
        espnPlayerId: r.espnPlayerId, name: r.name,
        position: r.position, nflTeam: r.nflTeam,
      },
    } satisfies RecordHolder,
  })

  const add = (
    key: string, label: string, tone: RecordTone,
    pool: ReturnType<typeof entry>[],
    valueOf: (r: RecordPlayerWeek) => number,
    cmp: (a: number, b: number) => boolean,
  ) => {
    const best = bestOf(pool, (e) => valueOf(e.r), cmp)
    if (!best || best.winners.length === 0) return
    records.push({
      key, label, group: 'player', scope: 'week', tone, format: 'points',
      value: best.value,
      holders: best.winners.map((w) => w.holder),
    })
  }

  const withProj = started.filter((r) => r.projectedPoints != null)
  const proj = (r: RecordPlayerWeek) => Number(r.projectedPoints)
  const pts = (r: RecordPlayerWeek) => Number(r.actualPoints)

  add('best_player_game', 'Best Player Performance', 'good',
    started.map((r) => entry(r, `${r.position} · ${r.nflTeam} · proj ${f(proj(r) || 0)}`)),
    pts, HIGH)

  // The worst STARTED performance. Restricted to players who were actually
  // expected to do something — otherwise this is permanently held by a kicker
  // projected for 0.4 who scored 0.3, which is not a story.
  add('worst_player_game', 'Worst Started Performance', 'bad',
    withProj.filter((r) => proj(r) >= 8)
      .map((r) => entry(r, `${r.position} · ${r.nflTeam} · projected ${f(proj(r))}`)),
    pts, LOW)

  add('biggest_overperformance', 'Biggest Over-Performance', 'good',
    withProj.map((r) => entry(r, `${f(proj(r))} projected, ${f(pts(r))} scored`)),
    (r) => pts(r) - proj(r), HIGH)

  add('biggest_underperformance', 'Biggest Under-Performance', 'bad',
    withProj.map((r) => entry(r, `${f(proj(r))} projected, ${f(pts(r))} scored`)),
    (r) => proj(r) - pts(r), HIGH)

  for (const pos of POSITIONS) {
    const pool = started.filter((r) => r.position === pos)
    add(`best_${pos}`, `Best ${pos}`, 'good',
      pool.map((r) => entry(r, `${r.nflTeam} · proj ${f(proj(r) || 0)}`)),
      pts, HIGH)
  }

  return records
}

export const POSITION_RECORD_KEYS = POSITIONS.map((p) => `best_${p}`)

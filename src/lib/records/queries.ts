/**
 * Everything the record book needs, across EVERY season.
 *
 * Deliberately not scoped to the current season. The page shows all-time
 * records only, so scoping the reads to one year would silently make "all
 * time" mean "this year" the moment a second season exists — the kind of bug
 * that stays invisible until the thing it breaks is a year of history.
 *
 * Volumes are small enough to read whole: one season is ~80 matchups, ~400
 * player-weeks and ~200 draft picks. Snapshots are the exception and are paged,
 * because a live Sunday produces hundreds an hour and PostgREST silently caps a
 * page — a truncated read would quietly shrink every comeback to whatever the
 * first page happened to hold.
 */
import { createPublicClient } from '@/lib/supabase/server'
import { AWARDS } from '@/lib/awards/catalog'
import type { RecordInputs } from './compute'

const SECTION_BY_KEY = new Map(AWARDS.map((a) => [a.key, a.section]))

export async function getAllTimeRecordInputs(): Promise<RecordInputs> {
  const db = createPublicClient()

  const { data: seasons, error: seasonError } = await db
    .from('seasons').select('id, year, lineup_slot_counts')
  if (seasonError) throw new Error(`seasons read failed: ${seasonError.message}`)

  const yearOf = new Map<number, number>()
  const slotCountsByYear: Record<number, Record<string, number>> = {}
  for (const s of seasons ?? []) {
    yearOf.set(s.id as number, s.year as number)
    const counts = s.lineup_slot_counts as Record<string, number> | null
    if (counts) slotCountsByYear[s.year as number] = counts
  }
  const year = (seasonId: number | null) => (seasonId == null ? 0 : yearOf.get(seasonId) ?? 0)

  const [matchupRes, playerRes, txnRes, draftRes, awardRes, teamRes] = await Promise.all([
    db.from('matchups')
      .select('id, season_id, week, home_team_id, away_team_id, home_score, away_score, status'),
    db.from('player_week_scores')
      .select('season_id, week, season_team_id, is_starter, lineup_slot_id, eligible_slots, actual_points, projected_points, players ( espn_player_id, full_name, position, nfl_team )'),
    db.from('transactions')
      .select('season_id, week, season_team_id, transaction_type, status, transaction_items ( action, to_team_id, players ( espn_player_id ) )')
      .eq('status', 'EXECUTED'),
    // draft_picks is DENORMALISED — it carries espn_team_id and a plain
    // `season` year rather than foreign keys, and holds sample rows from
    // before the real draft. Both have to be handled here.
    db.from('draft_picks')
      .select('season, espn_team_id, overall_pick, espn_player_id, player_name, position, pro_team, is_sample')
      .eq('is_sample', false),
    db.from('awards').select('season_id, week, award_type, recipient_team_id'),
    db.from('season_teams').select('id, season_id, espn_team_id'),
  ])
  for (const [name, res] of [
    ['matchups', matchupRes], ['player_week_scores', playerRes],
    ['transactions', txnRes], ['draft_picks', draftRes], ['awards', awardRes],
    ['season_teams', teamRes],
  ] as const) {
    if (res.error) throw new Error(`${name} read failed: ${res.error.message}`)
  }

  const matchups = (matchupRes.data ?? []).map((m) => ({
    week: m.week as number,
    year: year(m.season_id as number),
    homeTeamId: m.home_team_id as number | null,
    awayTeamId: m.away_team_id as number | null,
    homeScore: Number(m.home_score),
    awayScore: Number(m.away_score),
    status: m.status as string,
  }))

  type PRow = {
    season_id: number; week: number; season_team_id: number
    is_starter: boolean; lineup_slot_id: number; eligible_slots: number[] | null
    actual_points: number | null; projected_points: number | null
    players: { espn_player_id: number | null; full_name: string | null; position: string | null; nfl_team: string | null } | null
  }
  const players = (playerRes.data as unknown as PRow[] ?? [])
    .filter((r) => r.players?.espn_player_id != null)
    .map((r) => ({
      year: year(r.season_id),
      week: r.week,
      seasonTeamId: r.season_team_id,
      espnPlayerId: r.players!.espn_player_id as number,
      name: r.players!.full_name ?? 'Unknown player',
      position: r.players!.position ?? '',
      nflTeam: r.players!.nfl_team ?? '',
      isStarter: r.is_starter,
      lineupSlotId: r.lineup_slot_id,
      eligibleSlots: r.eligible_slots ?? [],
      actualPoints: r.actual_points == null ? null : Number(r.actual_points),
      projectedPoints: r.projected_points == null ? null : Number(r.projected_points),
    }))

  type TRow = {
    season_id: number; week: number | null; season_team_id: number | null
    transaction_type: string
    transaction_items: { action: string; to_team_id: number | null; players: { espn_player_id: number | null } | null }[] | null
  }
  const transactions = (txnRes.data as unknown as TRow[] ?? [])
    .filter((t) => t.season_team_id != null && t.week != null)
    .map((t) => ({
      year: year(t.season_id),
      week: t.week as number,
      seasonTeamId: t.season_team_id as number,
      kind: t.transaction_type,
      // A TRADE's items point both ways, so `action` alone marks every side as
      // a drop — the bug the recap's gather script shipped with. Anything
      // arriving at THIS team counts as acquired.
      acquiredPlayerIds: (t.transaction_items ?? [])
        .filter((i) =>
          (i.action === 'ADD' || i.to_team_id === t.season_team_id)
          && i.players?.espn_player_id != null)
        .map((i) => i.players!.espn_player_id as number),
    }))

  // espn_team_id -> season_teams.id, per season, because that is the only
  // handle draft_picks gives us.
  const seasonTeamByEspnId = new Map<string, number>()
  for (const t of teamRes.data ?? []) {
    seasonTeamByEspnId.set(
      `${year(t.season_id as number)}:${t.espn_team_id as number}`, t.id as number,
    )
  }

  type DRow = {
    season: number; espn_team_id: number; overall_pick: number
    espn_player_id: number | null; player_name: string | null
    position: string | null; pro_team: string | null
  }
  const draftPicks = (draftRes.data as unknown as DRow[] ?? [])
    .filter((d) => d.espn_player_id != null)
    .map((d) => ({
      year: d.season,
      seasonTeamId: seasonTeamByEspnId.get(`${d.season}:${d.espn_team_id}`) ?? -1,
      espnPlayerId: d.espn_player_id as number,
      name: d.player_name ?? 'Unknown player',
      position: d.position ?? '',
      nflTeam: d.pro_team ?? '',
      overall: d.overall_pick,
    }))
    // A pick we cannot attribute to a team on the table is not a record.
    .filter((d) => d.seasonTeamId > 0)

  const awards = (awardRes.data ?? [])
    .filter((a) => a.recipient_team_id != null && !String(a.award_type).startsWith('position_king_'))
    .map((a) => ({
      year: year(a.season_id as number),
      week: a.week as number,
      seasonTeamId: a.recipient_team_id as number,
      awardKey: a.award_type as string,
      section: (SECTION_BY_KEY.get(a.award_type as string) ?? 'STUDS') as 'STUDS' | 'DUDS',
    }))

  // ---- snapshots, paged ----
  const matchupMeta = new Map(
    (matchupRes.data ?? []).map((m) => [m.id as number, m]),
  )
  const snapshots: RecordInputs['snapshots'] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('matchup_snapshots')
      .select('matchup_id, home_score, away_score')
      .order('captured_at')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`matchup_snapshots read failed: ${error.message}`)
    if (!data || data.length === 0) break
    for (const s of data) {
      const m = matchupMeta.get(s.matchup_id as number)
      if (!m) continue
      snapshots.push({
        year: year(m.season_id as number),
        week: m.week as number,
        homeTeamId: m.home_team_id as number | null,
        awayTeamId: m.away_team_id as number | null,
        homeScore: Number(s.home_score),
        awayScore: Number(s.away_score),
      })
    }
    if (data.length < PAGE) break
  }

  return { matchups, players, transactions, draftPicks, awards, snapshots, slotCountsByYear }
}

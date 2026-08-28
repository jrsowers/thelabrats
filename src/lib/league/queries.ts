/**
 * Read queries for the public site. RLS-respecting client — these run with the
 * same privileges any visitor has, which keeps the security model honest.
 *
 * Columns are named explicitly rather than using `select(*)`: anon lacks
 * table-wide SELECT on transactions (raw_payload is withheld), and naming
 * columns everywhere keeps that consistent.
 */
import { createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'

export interface LeagueOverview {
  leagueName: string
  season: number
  regularSeasonWeeks: number
  playoffTeamCount: number
  seedingRule: string | null
  draftScheduledAt: string | null
  draftType: string | null
  draftCompleted: boolean
  usesFaab: boolean
  lineupSlotCounts: Record<string, number>
  teamCount: number
}

export async function getLeagueOverview(): Promise<LeagueOverview | null> {
  // Deployed before env vars are set: show a setup state rather than a 500 (§31).
  if (!isSupabaseConfigured()) return null
  const db = createPublicClient()
  const { data: league } = await db
    .from('leagues').select('id, name').limit(1).maybeSingle()
  if (!league) return null

  const { data: season } = await db
    .from('seasons')
    .select('id, year, regular_season_weeks, playoff_team_count, seeding_rule, draft_scheduled_at, draft_type, draft_completed, uses_faab, lineup_slot_counts')
    .eq('league_id', league.id)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!season) return null

  const { count } = await db
    .from('season_teams').select('id', { count: 'exact', head: true }).eq('season_id', season.id)

  return {
    leagueName: league.name,
    season: season.year,
    regularSeasonWeeks: season.regular_season_weeks,
    playoffTeamCount: season.playoff_team_count,
    seedingRule: season.seeding_rule,
    draftScheduledAt: season.draft_scheduled_at,
    draftType: season.draft_type,
    draftCompleted: season.draft_completed,
    usesFaab: season.uses_faab,
    lineupSlotCounts: (season.lineup_slot_counts ?? {}) as Record<string, number>,
    teamCount: count ?? 0,
  }
}

export interface MatchupRow {
  id: number
  matchupPeriod: number
  status: string
  home: { name: string; manager: string | null; abbrev: string | null; score: number } | null
  away: { name: string; manager: string | null; abbrev: string | null; score: number } | null
}

export async function getMatchupsForWeek(week: number): Promise<MatchupRow[]> {
  const db = createPublicClient()
  const { data } = await db
    .from('matchups')
    .select(`
      id, matchup_period, status, home_score, away_score,
      home:home_team_id ( team_name, abbreviation, franchises ( manager_name ) ),
      away:away_team_id ( team_name, abbreviation, franchises ( manager_name ) )
    `)
    .eq('matchup_period', week)
    .order('id')

  type Side = { team_name: string; abbreviation: string | null; franchises: { manager_name: string } | null } | null
  return (data ?? []).map((m) => {
    const home = m.home as unknown as Side
    const away = m.away as unknown as Side
    return {
      id: m.id,
      matchupPeriod: m.matchup_period,
      status: m.status,
      home: home ? { name: home.team_name, abbrev: home.abbreviation, manager: home.franchises?.manager_name ?? null, score: Number(m.home_score) } : null,
      away: away ? { name: away.team_name, abbrev: away.abbreviation, manager: away.franchises?.manager_name ?? null, score: Number(m.away_score) } : null,
    }
  })
}

export async function getPastChampions() {
  const db = createPublicClient()
  const { data } = await db
    .from('champions')
    .select('year, note, franchises ( manager_name, display_name )')
    .order('year', { ascending: false })
  return (data ?? []).map((c) => {
    const f = c.franchises as unknown as { manager_name: string; display_name: string } | null
    return { year: c.year, note: c.note, manager: f?.manager_name ?? 'Unknown' }
  })
}

export async function getLastSync() {
  const db = createPublicClient()
  const { data } = await db
    .from('sync_status')
    .select('sync_type, finished_at, status')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

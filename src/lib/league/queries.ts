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
  seasonId: number
  leagueName: string
  season: number
  regularSeasonWeeks: number
  playoffTeamCount: number
  seedingRule: string | null
  draftScheduledAt: string | null
  draftType: string | null
  currentWeek: number
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
    .select('id, year, regular_season_weeks, playoff_team_count, seeding_rule, draft_scheduled_at, draft_type, draft_completed, uses_faab, lineup_slot_counts, current_matchup_period')
    .eq('league_id', league.id)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!season) return null

  const { count } = await db
    .from('season_teams').select('id', { count: 'exact', head: true }).eq('season_id', season.id)

  return {
    seasonId: season.id,
    leagueName: league.name,
    season: season.year,
    regularSeasonWeeks: season.regular_season_weeks,
    playoffTeamCount: season.playoff_team_count,
    seedingRule: season.seeding_rule,
    draftScheduledAt: season.draft_scheduled_at,
    draftType: season.draft_type,
    // ESPN's own view of where the season is — never a hardcoded 1.
    currentWeek: season.current_matchup_period ?? 1,
    draftCompleted: season.draft_completed,
    usesFaab: season.uses_faab,
    lineupSlotCounts: (season.lineup_slot_counts ?? {}) as Record<string, number>,
    teamCount: count ?? 0,
  }
}

export interface MatchupSide {
  teamId: number
  name: string
  manager: string | null
  abbrev: string | null
  logoUrl: string | null
  photoUrl: string | null
  isChampion: boolean
  championYear: number | null
  score: number
  projected: number | null
  record: string
}

export interface MatchupRow {
  id: number
  matchupPeriod: number
  status: string
  home: MatchupSide | null
  away: MatchupSide | null
}

/**
 * Win/loss/tie per team, computed from FINAL matchups only.
 *
 * Derived rather than stored: standings_snapshots is the right home for this
 * once the standings engine exists, and duplicating it now would create two
 * sources of truth that can disagree.
 */
/**
 * The most recent champion, for the crown on their avatar. Reads from the
 * editorial `champions` table (§13) rather than being inferred, since seasons
 * predating the app have no ESPN data to infer from.
 */
export async function getReigningChampion(): Promise<{ franchiseId: number; year: number } | null> {
  const db = createPublicClient()
  const { data } = await db
    .from('champions')
    .select('franchise_id, year')
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { franchiseId: data.franchise_id, year: data.year } : null
}

export async function getTeamRecords(seasonId: number): Promise<Map<number, string>> {
  const db = createPublicClient()
  const { data } = await db
    .from('matchups')
    .select('home_team_id, away_team_id, home_score, away_score, winner_team_id, status')
    .eq('season_id', seasonId)
    .eq('status', 'FINAL')

  const tally = new Map<number, [number, number, number]>() // w, l, t
  const bump = (id: number | null, idx: 0 | 1 | 2) => {
    if (id == null) return
    const cur = tally.get(id) ?? [0, 0, 0]
    cur[idx] += 1
    tally.set(id, cur)
  }

  for (const m of data ?? []) {
    const tie = Number(m.home_score) === Number(m.away_score)
    if (tie) {
      bump(m.home_team_id, 2)
      bump(m.away_team_id, 2)
      continue
    }
    const homeWon = m.winner_team_id === m.home_team_id
    bump(m.home_team_id, homeWon ? 0 : 1)
    bump(m.away_team_id, homeWon ? 1 : 0)
  }

  const out = new Map<number, string>()
  for (const [id, [w, l, t]] of tally) out.set(id, t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`)
  return out
}

export async function getMatchupsForWeek(
  week: number,
  records: Map<number, string> = new Map(),
  champion: { franchiseId: number; year: number } | null = null,
): Promise<MatchupRow[]> {
  const db = createPublicClient()
  const { data } = await db
    .from('matchups')
    .select(`
      id, matchup_period, status, home_score, away_score,
      home_projected_score, away_projected_score,
      home:home_team_id ( id, team_name, abbreviation, logo_url, franchises ( id, manager_name, photo_url ) ),
      away:away_team_id ( id, team_name, abbreviation, logo_url, franchises ( id, manager_name, photo_url ) )
    `)
    .eq('matchup_period', week)
    .order('id')

  type Side = {
    id: number
    team_name: string
    abbreviation: string | null
    logo_url: string | null
    franchises: { id: number; manager_name: string; photo_url: string | null } | null
  } | null

  const toSide = (raw: Side, score: unknown, projected: unknown): MatchupSide | null =>
    raw
      ? {
          teamId: raw.id,
          name: raw.team_name,
          abbrev: raw.abbreviation,
          logoUrl: raw.logo_url,
          photoUrl: raw.franchises?.photo_url ?? null,
          isChampion: Boolean(champion && raw.franchises?.id === champion.franchiseId),
          championYear: champion?.year ?? null,
          manager: raw.franchises?.manager_name ?? null,
          score: Number(score),
          projected: projected == null ? null : Number(projected),
          record: records.get(raw.id) ?? '0-0',
        }
      : null

  return (data ?? []).map((m) => ({
    id: m.id,
    matchupPeriod: m.matchup_period,
    status: m.status,
    home: toSide(m.home as unknown as Side, m.home_score, m.home_projected_score),
    away: toSide(m.away as unknown as Side, m.away_score, m.away_projected_score),
  }))
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

export interface StandingsTeam {
  seasonTeamId: number
  name: string
  abbrev: string | null
  manager: string | null
  photoUrl: string | null
  logoUrl: string | null
  isChampion: boolean
  championYear: number | null
}

/** Every team in the season, with the identity the standings table renders. */
export async function getSeasonTeams(
  seasonId: number,
  champion: { franchiseId: number; year: number } | null = null,
): Promise<StandingsTeam[]> {
  const db = createPublicClient()
  const { data } = await db
    .from('season_teams')
    .select('id, team_name, abbreviation, logo_url, franchises ( id, manager_name, photo_url )')
    .eq('season_id', seasonId)
    .order('espn_team_id')

  type Row = {
    id: number
    team_name: string
    abbreviation: string | null
    logo_url: string | null
    franchises: { id: number; manager_name: string; photo_url: string | null } | null
  }

  return (data ?? []).map((raw) => {
    const t = raw as unknown as Row
    return {
      seasonTeamId: t.id,
      name: t.team_name,
      abbrev: t.abbreviation,
      manager: t.franchises?.manager_name ?? null,
      photoUrl: t.franchises?.photo_url ?? null,
      logoUrl: t.logo_url,
      isChampion: Boolean(champion && t.franchises?.id === champion.franchiseId),
      championYear: champion?.year ?? null,
    }
  })
}

/** All matchups in the season, in the shape the standings engine expects. */
export async function getSeasonResults(seasonId: number) {
  const db = createPublicClient()
  const { data } = await db
    .from('matchups')
    .select('matchup_period, home_team_id, away_team_id, home_score, away_score, status')
    .eq('season_id', seasonId)
    .order('matchup_period')

  return (data ?? []).map((m) => ({
    week: m.matchup_period,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeScore: Number(m.home_score),
    awayScore: Number(m.away_score),
    status: m.status,
  }))
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

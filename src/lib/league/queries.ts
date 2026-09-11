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
  /** Round -> weeks it spans. Empty means one week per round. */
  playoffRoundLengths: Record<string, number>
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
    .select('id, year, regular_season_weeks, playoff_team_count, seeding_rule, draft_scheduled_at, draft_type, draft_completed, uses_faab, lineup_slot_counts, current_matchup_period, playoff_round_lengths')
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
    playoffRoundLengths: (season.playoff_round_lengths ?? {}) as Record<string, number>,
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

  // Always W-L-T, even at 0-0-0. A record that changes shape once someone ties
  // makes the column jump, and a fantasy record is conventionally three parts.
  const out = new Map<number, string>()
  for (const [id, [w, l, t]] of tally) out.set(id, `${w}-${l}-${t}`)
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
          record: records.get(raw.id) ?? '0-0-0',
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
    .select(`matchup_period, home_team_id, away_team_id, home_score, away_score, status,
             home_projected_score, away_projected_score`)
    .eq('season_id', seasonId)
    .order('matchup_period')

  return (data ?? []).map((m) => ({
    week: m.matchup_period,
    homeTeamId: m.home_team_id,
    awayTeamId: m.away_team_id,
    homeScore: Number(m.home_score),
    awayScore: Number(m.away_score),
    status: m.status,
    // ESPN's pregame projection, for the Giant Killer / Choke Artist pair.
    homeProjected: m.home_projected_score == null ? null : Number(m.home_projected_score),
    awayProjected: m.away_projected_score == null ? null : Number(m.away_projected_score),
  }))
}

export interface PodiumEntry {
  place: number
  teamName: string
  managerName: string
  /** Null when the manager has since left the league. */
  franchiseId: number | null
  record: string | null
}

export interface SeasonHistory {
  year: number
  platform: string | null
  champion: {
    teamName: string
    managerName: string
    franchiseId: number
    record: string | null
    photoUrl: string | null
    titleGame: { opponent: string; scoreFor: number; scoreAgainst: number } | null
    note: string | null
  } | null
  podium: PodiumEntry[]
}

/** Completed seasons, newest first. Editorial data (§13). */
export async function getSeasonHistory(): Promise<SeasonHistory[]> {
  const db = createPublicClient()
  const [{ data: champions }, { data: podium }] = await Promise.all([
    db.from('champions')
      .select('year, team_name, record, platform, note, title_game_opponent, title_game_score_for, title_game_score_against, franchise_id, franchises ( manager_name, photo_url )')
      .order('year', { ascending: false }),
    db.from('season_podium')
      .select('year, place, team_name, manager_name, franchise_id, record')
      .order('year', { ascending: false })
      .order('place'),
  ])

  const years = [...new Set([
    ...(champions ?? []).map((c) => c.year),
    ...(podium ?? []).map((p) => p.year),
  ])].sort((a, b) => b - a)

  return years.map((year) => {
    const c = (champions ?? []).find((x) => x.year === year)
    const f = c?.franchises as unknown as { manager_name: string; photo_url: string | null } | null
    return {
      year,
      platform: c?.platform ?? null,
      champion: c && c.franchise_id
        ? {
            teamName: c.team_name ?? 'Champion',
            managerName: f?.manager_name ?? 'Unknown',
            franchiseId: c.franchise_id,
            record: c.record ?? null,
            photoUrl: f?.photo_url ?? null,
            titleGame: c.title_game_opponent && c.title_game_score_for != null
              ? {
                  opponent: c.title_game_opponent,
                  scoreFor: Number(c.title_game_score_for),
                  scoreAgainst: Number(c.title_game_score_against ?? 0),
                }
              : null,
            note: c.note ?? null,
          }
        : null,
      podium: (podium ?? [])
        .filter((p) => p.year === year)
        .map((p) => ({
          place: p.place,
          teamName: p.team_name,
          managerName: p.manager_name,
          franchiseId: p.franchise_id,
          record: p.record,
        })),
    }
  })
}

/** A sample of the synced player pool, used to make placeholder awards
 *  look like a real week rather than "Player A". */
export async function getPlayerSample(limit = 120) {
  const db = createPublicClient()
  const { data } = await db
    .from('players')
    .select('espn_player_id, full_name, position, nfl_team')
    .eq('active', true)
    .not('position', 'in', '("K","D/ST")')
    .order('id')
    .limit(limit)

  return (data ?? []).map((p) => ({
    espnPlayerId: p.espn_player_id,
    name: p.full_name,
    position: p.position ?? '',
    nflTeam: p.nfl_team ?? '',
  }))
}

/**
 * Is there anything in this week that can still move the numbers?
 *
 * The scoreboard derives this from matchups it already loaded; every other
 * page would have to load the full matchup graph just to answer it, so this
 * asks the cheap question directly. Drives the auto-refresh indicator — the
 * live dot must never claim a page is updating when nothing can change.
 */
export async function hasActiveGames(week: number): Promise<boolean> {
  const db = createPublicClient()
  const { data } = await db
    .from('matchups')
    .select('status')
    .eq('matchup_period', week)
    .in('status', ['LIVE', 'SCHEDULED'])
    .limit(1)
  return (data?.length ?? 0) > 0
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

/**
 * The transaction log.
 *
 * Returns the same shape the preview generator produces, so the page renders
 * real and simulated moves through identical code.
 *
 * DRAFT transactions are excluded. All 180 picks are transactions as far as
 * ESPN is concerned, and including them would bury every waiver claim and trade
 * under the draft forever — the picks have their own page.
 *
 * Only EXECUTED moves appear. ESPN also sends cancelled waiver claims and
 * pending trade proposals, and both were rendering as though they had happened.
 */
export interface LogTxnItem {
  /** ESPN id, for the headshot. Negative for a team defense. */
  espnPlayerId: number | null
  playerName: string
  position: string
  nflTeam: string
  action: 'ADD' | 'DROP' | 'TRADE'
  fromTeamId: number | null
  toTeamId: number | null
}

export interface LogTxn {
  id: string
  kind: 'WAIVER' | 'FREE_AGENT' | 'TRADE' | 'DROP' | 'IR_PLACE' | 'IR_ACTIVATE'
  processedAt: string
  week: number
  teamId: number
  counterpartyTeamId: number | null
  waiverPriority: number | null
  items: LogTxnItem[]
}

export async function getTransactionLog(seasonId: number, limit = 200): Promise<LogTxn[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, espn_transaction_id, transaction_type, processed_at, proposed_at, week,
      season_team_id, faab_amount,
      transaction_items ( action, from_team_id, to_team_id,
        players ( espn_player_id, full_name, position, nfl_team ) )
    `)
    .eq('season_id', seasonId)
    .neq('transaction_type', 'DRAFT')
    // A log records what HAPPENED. A cancelled waiver and a pending trade
    // proposal both showed here as though they had gone through.
    .eq('status', 'EXECUTED')
    .order('processed_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  type Row = {
    id: number; espn_transaction_id: string; transaction_type: string
    processed_at: string | null; proposed_at: string | null; week: number | null
    season_team_id: number | null
    transaction_items: {
      action: string; from_team_id: number | null; to_team_id: number | null
      players: { espn_player_id: number | null; full_name: string | null; position: string | null; nfl_team: string | null } | null
    }[] | null
  }

  return (data as unknown as Row[])
    .filter((r) => r.season_team_id != null && (r.transaction_items?.length ?? 0) > 0)
    .map((r) => {
      const items: LogTxnItem[] = (r.transaction_items ?? []).map((it) => ({
        espnPlayerId: it.players?.espn_player_id ?? null,
        playerName: it.players?.full_name ?? 'Unknown player',
        position: it.players?.position ?? '',
        nflTeam: it.players?.nfl_team ?? '',
        action: (it.action as LogTxnItem['action']) ?? 'ADD',
        fromTeamId: it.from_team_id,
        toTeamId: it.to_team_id,
      }))

      const counterparty = items
        .map((i) => (i.fromTeamId === r.season_team_id ? i.toTeamId : i.fromTeamId))
        .find((t) => t != null && t !== r.season_team_id) ?? null

      const kind: LogTxn['kind'] =
        r.transaction_type === 'TRADE' ? 'TRADE'
        : r.transaction_type === 'WAIVER' ? 'WAIVER'
        // IR moves arrive as ESPN ROSTER rows and carry their own type; they
        // are lineup changes, not acquisitions, so they never fold into
        // FREE_AGENT.
        : r.transaction_type === 'IR_PLACE' ? 'IR_PLACE'
        : r.transaction_type === 'IR_ACTIVATE' ? 'IR_ACTIVATE'
        : items.every((i) => i.action === 'DROP') ? 'DROP'
        : 'FREE_AGENT'

      return {
        id: r.espn_transaction_id,
        kind,
        processedAt: r.processed_at ?? r.proposed_at ?? new Date(0).toISOString(),
        week: r.week ?? 0,
        teamId: r.season_team_id as number,
        counterpartyTeamId: counterparty,
        waiverPriority: null,
        items,
      }
    })
}

/* ============================================================
   ESPN's own standings and playoff forecast
   ============================================================ */

export interface EspnStandingRow {
  seasonTeamId: number
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  streakType: string | null
  streakLength: number
  playoffSeed: number | null
  playoffClinch: string | null
  eliminated: boolean
  eliminationWeek: number | null
  /** 0-1. Null when ESPN has not published a simulation. */
  playoffOdds: number | null
  projectedRank: number | null
  projectedWins: number | null
  projectedLosses: number | null
}

/**
 * What ESPN says the standings are. Mirrored each sync; see the migration for
 * why we keep it alongside our own computation rather than instead of it.
 *
 * Returns an empty array when the table is empty or unreachable — every caller
 * falls back to the computed table, so ESPN going quiet degrades the page
 * instead of breaking it (CLAUDE.md).
 */
export async function getEspnStandings(seasonId: number): Promise<EspnStandingRow[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('espn_team_standings')
    .select(`season_team_id, wins, losses, ties, points_for, points_against,
             streak_type, streak_length, playoff_seed, playoff_clinch, eliminated,
             elimination_week, playoff_odds, projected_rank, projected_wins, projected_losses`)
    .eq('season_id', seasonId)

  if (error || !data) return []

  return data.map((r) => ({
    seasonTeamId: r.season_team_id,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    pointsFor: Number(r.points_for),
    pointsAgainst: Number(r.points_against),
    streakType: r.streak_type,
    streakLength: r.streak_length,
    playoffSeed: r.playoff_seed,
    playoffClinch: r.playoff_clinch,
    eliminated: r.eliminated,
    eliminationWeek: r.elimination_week,
    playoffOdds: r.playoff_odds == null ? null : Number(r.playoff_odds),
    projectedRank: r.projected_rank,
    projectedWins: r.projected_wins,
    projectedLosses: r.projected_losses,
  }))
}

/* ============================================================
   Per-player weekly scoring
   ============================================================ */

export interface WeekPlayerScore {
  seasonTeamId: number
  espnPlayerId: number
  name: string
  position: string
  nflTeam: string
  lineupSlot: string
  isStarter: boolean
  /** Null until the player's game kicks off — not the same as zero. */
  actualPoints: number | null
  projectedPoints: number | null
}

/**
 * Every rostered player's line for one week.
 *
 * Feeds the player-level awards and the expanded boxscore. Returns an empty
 * array rather than throwing when the week has not been ingested, so a page
 * degrades to its placeholders instead of failing (CLAUDE.md).
 */
export async function getPlayerWeekScores(
  seasonId: number,
  week: number,
): Promise<WeekPlayerScore[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('player_week_scores')
    .select(`season_team_id, lineup_slot, is_starter, actual_points, projected_points,
             players ( espn_player_id, full_name, position, nfl_team )`)
    .eq('season_id', seasonId)
    .eq('week', week)

  if (error || !data) return []

  type Row = {
    season_team_id: number; lineup_slot: string; is_starter: boolean
    actual_points: number | null; projected_points: number | null
    players: { espn_player_id: number | null; full_name: string | null; position: string | null; nfl_team: string | null } | null
  }

  return (data as unknown as Row[])
    .filter((r) => r.players?.espn_player_id != null)
    .map((r) => ({
      seasonTeamId: r.season_team_id,
      espnPlayerId: r.players!.espn_player_id as number,
      name: r.players!.full_name ?? 'Unknown player',
      position: r.players!.position ?? '',
      nflTeam: r.players!.nfl_team ?? '',
      lineupSlot: r.lineup_slot,
      isStarter: r.is_starter,
      actualPoints: r.actual_points == null ? null : Number(r.actual_points),
      projectedPoints: r.projected_points == null ? null : Number(r.projected_points),
    }))
}

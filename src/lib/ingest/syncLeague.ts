/**
 * ESPN -> Postgres ingestion.
 *
 * Every write is an idempotent upsert keyed on an ESPN identifier (§30), so
 * running this twice changes nothing the second time. Failures are recorded in
 * sync_runs and leave existing data untouched (§31).
 */
import { EspnClient } from '@/lib/espn/client'
import { VIEWS } from '@/lib/espn/constants'
import {
  toLeagueSettings, toLeagueStatus, toManagers, toTeams, toMatchups,
} from '@/lib/espn/transforms'
import { createServiceClient } from '@/lib/supabase/server'

export interface SyncResult {
  ok: boolean
  recordsProcessed: number
  detail: Record<string, number>
  error?: string
}

export async function syncLeague(): Promise<SyncResult> {
  const db = createServiceClient()
  const season = Number(process.env.ESPN_SEASON)

  const { data: run } = await db
    .from('sync_runs')
    .insert({ sync_type: 'league-metadata', status: 'RUNNING' })
    .select('id')
    .single()

  const detail: Record<string, number> = {}
  try {
    const espn = new EspnClient({
      leagueId: Number(process.env.ESPN_LEAGUE_ID),
      season,
      swid: process.env.ESPN_SWID || undefined,
      espnS2: process.env.ESPN_S2 || undefined,
    })

    // One request, several views — cheaper for us and politer to ESPN.
    const meta = await espn.getViews([VIEWS.SETTINGS, VIEWS.TEAM, VIEWS.STATUS])
    const settings = toLeagueSettings(meta, season)
    const status = toLeagueStatus(meta)

    // ---- league ----
    const { data: league } = await db
      .from('leagues')
      .upsert(
        { espn_league_id: settings.espnLeagueId, name: settings.name, timezone: 'America/New_York' },
        { onConflict: 'espn_league_id' },
      )
      .select('id')
      .single()
    if (!league) throw new Error('failed to upsert league')
    detail.leagues = 1

    // ---- season ----
    const { data: seasonRow } = await db
      .from('seasons')
      .upsert(
        {
          league_id: league.id,
          year: settings.season,
          status: settings.draft.completed ? 'ACTIVE' : 'PRESEASON',
          regular_season_weeks: settings.regularSeasonWeeks,
          final_scoring_period: settings.finalScoringPeriod,
          playoff_team_count: settings.playoffTeamCount,
          seeding_rule: settings.seedingRule,
          has_divisions: settings.hasDivisions,
          uses_faab: settings.usesFaab,
          faab_budget: settings.faabBudget,
          acquisition_type: settings.acquisitionType,
          lineup_slot_counts: settings.lineupSlotCounts,
          draft_type: settings.draft.type,
          draft_scheduled_at: settings.draft.scheduledAt,
          draft_completed: settings.draft.completed,
          current_matchup_period: status.currentMatchupPeriod,
          latest_scoring_period: status.latestScoringPeriod,
        },
        { onConflict: 'league_id,year' },
      )
      .select('id')
      .single()
    if (!seasonRow) throw new Error('failed to upsert season')
    detail.seasons = 1

    // ---- franchises (keyed on ESPN member GUID, stable across seasons) ----
    const managers = toManagers(meta)
    const { data: franchises } = await db
      .from('franchises')
      .upsert(
        managers.map((m) => ({
          league_id: league.id,
          espn_member_id: m.espnMemberId,
          display_name: `${m.firstName} ${m.lastName}`.trim() || m.displayName,
          manager_name: `${m.firstName} ${m.lastName}`.trim() || m.displayName,
        })),
        { onConflict: 'league_id,espn_member_id' },
      )
      .select('id, espn_member_id')
    detail.franchises = franchises?.length ?? 0

    const franchiseByMember = new Map((franchises ?? []).map((f) => [f.espn_member_id, f.id]))

    // ---- season teams ----
    const teams = toTeams(meta)
    const { data: seasonTeams } = await db
      .from('season_teams')
      .upsert(
        teams.map((t) => ({
          season_id: seasonRow.id,
          espn_team_id: t.espnTeamId,
          team_name: t.name,
          abbreviation: t.abbreviation,
          logo_url: t.logoUrl,
          division_id: t.divisionId,
          // First owner wins. Co-managed teams keep one canonical franchise.
          franchise_id: franchiseByMember.get(t.ownerIds[0]) ?? null,
        })),
        { onConflict: 'season_id,espn_team_id' },
      )
      .select('id, espn_team_id')
    detail.season_teams = seasonTeams?.length ?? 0

    const teamIdByEspnId = new Map((seasonTeams ?? []).map((t) => [t.espn_team_id, t.id]))

    // ---- matchups ----
    // mMatchupScore is the ONLY view with a complete matchup shape. See
    // AI-References/ESPN-API.md before changing this.
    const scheduleRes = await espn.getViews([VIEWS.MATCHUP_SCORE])
    const matchups = toMatchups(scheduleRes)
    if (matchups.length === 0) {
      throw new Error('mMatchupScore returned no usable matchups — ESPN shape may have changed')
    }

    const { data: written } = await db
      .from('matchups')
      .upsert(
        matchups.map((m) => ({
          season_id: seasonRow.id,
          espn_matchup_id: m.espnMatchupId,
          matchup_period: m.matchupPeriod,
          week: m.week,
          home_team_id: m.homeTeamId ? teamIdByEspnId.get(m.homeTeamId) ?? null : null,
          away_team_id: m.awayTeamId ? teamIdByEspnId.get(m.awayTeamId) ?? null : null,
          home_score: m.homeScore,
          away_score: m.awayScore,
          home_projected_score: m.homeProjectedScore,
          away_projected_score: m.awayProjectedScore,
          status: m.status,
          winner_team_id: m.winnerTeamId ? teamIdByEspnId.get(m.winnerTeamId) ?? null : null,
          margin: Math.abs(m.homeScore - m.awayScore),
          is_playoff: m.isPlayoff,
          last_synced_at: new Date().toISOString(),
        })),
        { onConflict: 'season_id,espn_matchup_id,matchup_period' },
      )
      .select('id')
    detail.matchups = written?.length ?? 0

    // ---- editorial: past champions ----
    // ESPN holds no 2025 season for this league, so this cannot be ingested.
    // Seeded here because it needs a franchise to reference (§13).
    const champion = franchises?.find((f) =>
      managers.find((m) => m.espnMemberId === f.espn_member_id &&
        `${m.firstName} ${m.lastName}`.trim() === 'Chenell Basilio'))
    if (champion) {
      await db.from('champions').upsert(
        { league_id: league.id, year: 2025, franchise_id: champion.id, note: 'Inaugural season' },
        { onConflict: 'league_id,year' },
      )
      detail.champions = 1
    }

    const recordsProcessed = Object.values(detail).reduce((a, b) => a + b, 0)
    if (run) {
      await db.from('sync_runs').update({
        status: 'SUCCESS', finished_at: new Date().toISOString(),
        records_processed: recordsProcessed,
        metadata: { detail, currentMatchupPeriod: status.currentMatchupPeriod },
      }).eq('id', run.id)
    }
    return { ok: true, recordsProcessed, detail }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (run) {
      await db.from('sync_runs').update({
        status: 'FAILED', finished_at: new Date().toISOString(), error_message: message,
      }).eq('id', run.id)
    }
    // Existing data is untouched — the app keeps serving last-known-good (§31).
    return { ok: false, recordsProcessed: 0, detail, error: message }
  }
}

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
  toLeagueSettings, toLeagueStatus, toManagers, toTeams, toMatchups, toTransactions, toEspnStandings,
} from '@/lib/espn/transforms'
import { createServiceClient } from '@/lib/supabase/server'

export interface SyncResult {
  ok: boolean
  recordsProcessed: number
  detail: Record<string, number>
  error?: string
}

/**
 * espn_player_id -> our players.id, paged past PostgREST's default row cap.
 *
 * A single unpaged select silently returns only the first page, which would
 * drop most transaction items on the floor without erroring.
 */
async function loadPlayerIdMap(
  db: ReturnType<typeof createServiceClient>,
): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('players')
      .select('id, espn_player_id')
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    for (const r of data) {
      if (r.espn_player_id != null) out.set(r.espn_player_id as number, r.id as number)
    }
    if (data.length < PAGE) break
  }
  return out
}

export async function syncLeague(syncType = 'league-metadata'): Promise<SyncResult> {
  const db = createServiceClient()
  const season = Number(process.env.ESPN_SEASON)

  const { data: run } = await db
    .from('sync_runs')
    .insert({ sync_type: syncType, status: 'RUNNING' })
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
    // mStandings rides along free on the same request. It is the ONLY view
    // carrying ESPN's playoff simulation and clinch type; mTeam alone has the
    // record and seed but neither of those.
    const meta = await espn.getViews([VIEWS.SETTINGS, VIEWS.TEAM, VIEWS.STATUS, VIEWS.STANDINGS])
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
          playoff_round_lengths: settings.playoffRoundLengths,
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

    // ---- ESPN's own standings + playoff forecast ----
    // Mirrored, never trusted blindly: the pages still compute the record from
    // `matchups` and reconcile against this.
    const espnStandings = toEspnStandings(meta)
      .filter((r) => teamIdByEspnId.has(r.espnTeamId))
    if (espnStandings.length > 0) {
      const { data: writtenStandings, error: standingsError } = await db
        .from('espn_team_standings')
        .upsert(
          espnStandings.map((r) => ({
            season_team_id: teamIdByEspnId.get(r.espnTeamId)!,
            season_id: seasonRow.id,
            wins: r.wins,
            losses: r.losses,
            ties: r.ties,
            points_for: r.pointsFor,
            points_against: r.pointsAgainst,
            streak_type: r.streakType,
            streak_length: r.streakLength,
            games_back: r.gamesBack,
            playoff_seed: r.playoffSeed,
            playoff_clinch: r.playoffClinch,
            eliminated: r.eliminated,
            elimination_week: r.eliminationWeek,
            final_rank: r.finalRank,
            playoff_odds: r.playoffOdds,
            projected_rank: r.projectedRank,
            projected_wins: r.projectedWins,
            projected_losses: r.projectedLosses,
            waiver_rank: r.waiverRank,
            synced_at: new Date().toISOString(),
          })),
          { onConflict: 'season_team_id' },
        )
        .select('season_team_id')
      if (standingsError) throw new Error(`espn_team_standings upsert failed: ${standingsError.message}`)
      detail.espn_team_standings = writtenStandings?.length ?? 0
    }

    // ---- matchups ----
    // mMatchupScore is the ONLY view with a complete matchup shape. See
    // AI-References/ESPN-API.md before changing this.
    const scheduleRes = await espn.getViews([VIEWS.MATCHUP_SCORE])
    const matchups = toMatchups(scheduleRes)
    if (matchups.length === 0) {
      throw new Error('mMatchupScore returned no usable matchups — ESPN shape may have changed')
    }

    // What we already had, so we can tell which scores actually MOVED.
    //
    // ⚠️ The error is surfaced. An earlier version destructured only `data`,
    // and a failed read there did not merely skip the comparison — every
    // matchup then looked brand new, and the bulk upsert wrote
    // `score_changed_at: null` across all 78 rows. Five of week 1's six lost
    // their stamp that way, silently, during a live slate.
    const { data: priorRows, error: priorError } = await db
      .from('matchups')
      .select('espn_matchup_id, matchup_period, home_score, away_score, score_changed_at')
      .eq('season_id', seasonRow.id)
    if (priorError) throw new Error(`matchups read failed: ${priorError.message}`)

    const priorByKey = new Map(
      (priorRows ?? []).map((r) => [`${r.espn_matchup_id}:${r.matchup_period}`, r]),
    )
    const syncedAt = new Date().toISOString()

    // Which matchups moved this sync. Stamped AFTER the upsert, as a targeted
    // update of only these rows — see below.
    const movedKeys: { espnMatchupId: number; matchupPeriod: number }[] = []

    const { data: written } = await db
      .from('matchups')
      .upsert(
        matchups.map((m) => {
          const prior = priorByKey.get(`${m.espnMatchupId}:${m.matchupPeriod}`)
          // A row with no history has nothing to compare against, so it does
          // NOT count as movement — otherwise the first sync of the season
          // would read as 78 live matchups.
          const moved =
            prior != null &&
            (Number(prior.home_score) !== m.homeScore ||
              Number(prior.away_score) !== m.awayScore)
          if (moved) {
            movedKeys.push({ espnMatchupId: m.espnMatchupId, matchupPeriod: m.matchupPeriod })
          }

          return {
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
          last_synced_at: syncedAt,
          }
        }),
        { onConflict: 'season_id,espn_matchup_id,matchup_period' },
      )
      .select('id')
    detail.matchups = written?.length ?? 0

    // Stamp the movers, and ONLY the movers.
    //
    // Kept out of the bulk upsert deliberately. Every row in one upsert must
    // carry the same columns, so a matchup we could not compare would have had
    // to send *something* for `score_changed_at` — and the something was null,
    // which erased history rather than declining to add to it. A targeted
    // update can say nothing about the rows it does not touch.
    //
    // One statement per mover rather than two `.in()` filters: those would
    // match the CROSS PRODUCT of ids and periods, stamping matchups that never
    // moved. At most a handful of games move in any one sync, so the round
    // trips are cheap and the filter is exactly the row's unique key.
    for (const key of movedKeys) {
      const { error: stampError } = await db
        .from('matchups')
        .update({ score_changed_at: syncedAt })
        .eq('season_id', seasonRow.id)
        .eq('espn_matchup_id', key.espnMatchupId)
        .eq('matchup_period', key.matchupPeriod)
      if (stampError) throw new Error(`score_changed_at update failed: ${stampError.message}`)
    }
    detail.scoresMoved = movedKeys.length

    // ---- transactions ----
    // Upserted on espn_transaction_id so a move seen by two syncs inserts once
    // (§15.4). Player NAMES are not available here — they arrive with the roster
    // sync, which cannot be built until rosters exist after the Sept 3 draft.
    // Until then rows are stored with their ESPN player ids intact so nothing is
    // lost, and the log reads from them once names can be resolved.
    const txnRes = await espn.getViews([VIEWS.TRANSACTIONS])
    const transactions = toTransactions(txnRes)

    if (transactions.length > 0) {
      const { data: writtenTxns, error: txnError } = await db
        .from('transactions')
        .upsert(
          transactions.map((t) => ({
            season_id: seasonRow.id,
            espn_transaction_id: t.espnTransactionId,
            transaction_type: t.type,
            status: t.status,
            season_team_id: t.espnTeamId ? teamIdByEspnId.get(t.espnTeamId) ?? null : null,
            proposed_at: t.proposedAt,
            processed_at: t.processedAt,
            week: t.scoringPeriod,
            faab_amount: t.faabAmount,
          })),
          { onConflict: 'season_id,espn_transaction_id' },
        )
        .select('id, espn_transaction_id')

      // Surface it. This upsert previously destructured only `data`, so a
      // failed write was indistinguishable from a successful one: a trade sat
      // missing from the log for two days while every sync reported SUCCESS.
      if (txnError) throw new Error(`transactions upsert failed: ${txnError.message}`)
      detail.transactions = writtenTxns?.length ?? 0

      // A silent partial is just as bad. If the database took fewer rows than
      // we sent, say so rather than moving on.
      if ((writtenTxns?.length ?? 0) !== transactions.length) {
        throw new Error(
          `transactions upsert wrote ${writtenTxns?.length ?? 0} of ${transactions.length}`,
        )
      }

      // Items were computed and then thrown away — transaction_items had zero
      // rows while transactions had 180, so the log could never render anything.
      const txnIdByEspnId = new Map(
        (writtenTxns ?? []).map((r) => [r.espn_transaction_id as string, r.id as number]),
      )
      const playerIdByEspnId = await loadPlayerIdMap(db)

      const items = transactions.flatMap((t) => {
        const txnId = txnIdByEspnId.get(t.espnTransactionId)
        if (!txnId) return []
        return t.items.flatMap((it) => {
          const playerId = playerIdByEspnId.get(it.espnPlayerId)
          // A player we have never synced cannot be referenced; skip rather
          // than fail the whole batch on a foreign key.
          if (!playerId) return []
          return [{
            transaction_id: txnId,
            player_id: playerId,
            action: it.action,
            from_team_id: it.fromTeamId ? teamIdByEspnId.get(it.fromTeamId) ?? null : null,
            to_team_id: it.toTeamId ? teamIdByEspnId.get(it.toTeamId) ?? null : null,
          }]
        })
      })

      if (items.length > 0) {
        // Replace rather than upsert: there is no natural key on an item, and a
        // second sync would otherwise duplicate every one of them.
        await db.from('transaction_items')
          .delete()
          .in('transaction_id', [...txnIdByEspnId.values()])
        const { error: itemError } = await db.from('transaction_items').insert(items)
        if (itemError) throw new Error(`transaction_items insert failed: ${itemError.message}`)
      }
      detail.transactionItems = items.length
    } else {
      detail.transactions = 0
    }

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

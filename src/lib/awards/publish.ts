/**
 * The award release step the sync runs on every tick.
 *
 * Gathers what `decideRelease` needs, asks it, and generates whatever it names.
 * Almost every call is a no-op that answers "nothing due" after two cheap
 * reads, which is the same shape as the sync cadence and for the same reason:
 * a condition evaluated often beats a calendar entry fired once, because a
 * missed tick costs minutes instead of a whole week.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { rankMovementFor, type SeedHistory } from '@/lib/standings/compute'
import { decideRelease } from './release'
import { generateWeeklyAwards, type GenerateResult } from './generate'
import type { AwardMatchup, AwardPlayer, AwardTransaction, AwardSnapshot } from './compute'

export interface PublishResult {
  ok: boolean
  reason: string
  generated: GenerateResult[]
  error?: string
}

export async function publishDueAwards(
  seasonId: number,
  now: Date,
  /**
   * Force these weeks to be rebuilt, ignoring the release window and the
   * already-generated check.
   *
   * ⚠️ REWRITES SETTLED CARDS. Awards are generated once on purpose (§22.8) so
   * that a card somebody screenshotted does not quietly change. This exists for
   * the narrower case the `regenerate` flag was always meant for: a FORMULA was
   * wrong, and the stored card is therefore wrong. Immutability protects
   * against drift, not against correcting a bug — a card that is knowably
   * false is worse than a card that changed.
   *
   * Used once so far, for week 2 of 2026, when Free Fallin' was found to be
   * reading rank movement from a different table than the standings page.
   */
  { regenerateWeeks = [] }: { regenerateWeeks?: number[] } = {},
): Promise<PublishResult> {
  const db = createServiceClient()

  try {
    const [matchupRes, awardRes, seasonRes, teamRes, seedRes] = await Promise.all([
      db.from('matchups')
        .select('id, week, home_team_id, away_team_id, home_score, away_score, status, home_projected_score, away_projected_score')
        .eq('season_id', seasonId),
      db.from('awards').select('week').eq('season_id', seasonId),
      db.from('seasons').select('lineup_slot_counts').eq('id', seasonId).maybeSingle(),
      db.from('season_teams').select('id, team_name').eq('season_id', seasonId),
      db.from('standings_snapshots')
        .select('week, season_team_id, espn_seed').eq('season_id', seasonId),
    ])
    if (matchupRes.error) throw new Error(`matchups read failed: ${matchupRes.error.message}`)
    if (awardRes.error) throw new Error(`awards read failed: ${awardRes.error.message}`)
    if (seasonRes.error) throw new Error(`season read failed: ${seasonRes.error.message}`)
    if (teamRes.error) throw new Error(`season_teams read failed: ${teamRes.error.message}`)
    if (seedRes.error) throw new Error(`standings_snapshots read failed: ${seedRes.error.message}`)

    // week -> (team -> ESPN seed). The only record of a PAST week's table.
    const seedHistory: SeedHistory = new Map()
    for (const row of seedRes.data ?? []) {
      const wk = row.week as number
      // espn_seed, NOT seed — the latter is a local points-for ordering that
      // disagrees with the ranks the standings page displays.
      const seed = row.espn_seed as number | null
      if (seed == null) continue
      if (!seedHistory.has(wk)) seedHistory.set(wk, new Map())
      seedHistory.get(wk)!.set(row.season_team_id as number, seed)
    }

    // The shape of a legal lineup. Without it the optimizer has no seats and
    // the two lineup awards stay placeholders rather than guessing.
    const slotCounts = (seasonRes.data?.lineup_slot_counts ?? {}) as Record<string, number>

    const matchups = matchupRes.data ?? []

    // A week counts as finished only when EVERY one of its matchups is final.
    // Any looser test releases a week while a game is still being played.
    const byWeek = new Map<number, { total: number; final: number }>()
    for (const m of matchups) {
      if (m.week == null) continue
      const acc = byWeek.get(m.week) ?? { total: 0, final: 0 }
      acc.total += 1
      if (m.status === 'FINAL') acc.final += 1
      byWeek.set(m.week, acc)
    }
    const finalWeeks = [...byWeek.entries()]
      .filter(([, acc]) => acc.total > 0 && acc.total === acc.final)
      .map(([week]) => week)
      .sort((a, b) => a - b)

    const generatedWeeks = [...new Set(
      (awardRes.data ?? []).map((r) => r.week).filter((w): w is number => w != null),
    )]

    const forced = regenerateWeeks.filter((w) => finalWeeks.includes(w))
    const decision = forced.length > 0
      ? { weeks: forced, reason: `forced rebuild of week(s) ${forced.join(', ')}` }
      : decideRelease({ now, finalWeeks, generatedWeeks })
    if (decision.weeks.length === 0) {
      return { ok: true, reason: decision.reason, generated: [] }
    }

    const generated: GenerateResult[] = []
    for (const week of decision.weeks) {
      const awardMatchups: AwardMatchup[] = matchups
        .filter((m) => m.week != null)
        .map((m) => ({
          matchupId: m.id,
          week: m.week as number,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          homeScore: Number(m.home_score),
          awayScore: Number(m.away_score),
          status: m.status,
          homeProjected: m.home_projected_score == null ? null : Number(m.home_projected_score),
          awayProjected: m.away_projected_score == null ? null : Number(m.away_projected_score),
        }))

      const { data: scores, error } = await db
        .from('player_week_scores')
        .select('season_team_id, is_starter, lineup_slot_id, eligible_slots, actual_points, projected_points, players ( espn_player_id, full_name, position, nfl_team )')
        .eq('season_id', seasonId)
        .eq('week', week)
      if (error) throw new Error(`player_week_scores read failed: ${error.message}`)

      type Row = {
        season_team_id: number; is_starter: boolean
        lineup_slot_id: number; eligible_slots: number[] | null
        actual_points: number | null; projected_points: number | null
        players: { espn_player_id: number | null; full_name: string | null; position: string | null; nfl_team: string | null } | null
      }

      const players: AwardPlayer[] = (scores as unknown as Row[] ?? [])
        .filter((r) => r.players?.espn_player_id != null)
        .map((r) => ({
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

      // ---- the week's roster moves ----
      // EXECUTED only: a cancelled waiver and a pending trade are not moves
      // anybody made. DRAFT is excluded — 180 picks would win every week.
      const { data: txns, error: txnError } = await db
        .from('transactions')
        .select('id, transaction_type, season_team_id, transaction_items ( action, players ( espn_player_id ) )')
        .eq('season_id', seasonId)
        .eq('week', week)
        .eq('status', 'EXECUTED')
        .neq('transaction_type', 'DRAFT')
      if (txnError) throw new Error(`transactions read failed: ${txnError.message}`)

      type TxnRow = {
        transaction_type: string; season_team_id: number | null
        transaction_items: { action: string; players: { espn_player_id: number | null } | null }[] | null
      }

      const transactions: AwardTransaction[] = (txns as unknown as TxnRow[] ?? [])
        .filter((t) => t.season_team_id != null)
        .map((t) => ({
          seasonTeamId: t.season_team_id as number,
          kind: t.transaction_type,
          acquiredPlayerIds: (t.transaction_items ?? [])
            .filter((i) => i.action === 'ADD' && i.players?.espn_player_id != null)
            .map((i) => i.players!.espn_player_id as number),
        }))

      // ---- in-game captures ----
      // Only Sweatin' It Out reads these, and only for this week's matchups.
      // Paged past PostgREST's row cap: a live Sunday produces hundreds of
      // snapshots an hour, and a silently truncated first page would quietly
      // shrink every comeback to whatever the tail happened to contain.
      const weekMatchupIds = matchups.filter((m) => m.week === week).map((m) => m.id)
      const snapshots: AwardSnapshot[] = []
      if (weekMatchupIds.length > 0) {
        const PAGE = 1000
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await db
            .from('matchup_snapshots')
            .select('matchup_id, home_score, away_score, captured_at')
            .in('matchup_id', weekMatchupIds)
            .order('captured_at')
            .range(from, from + PAGE - 1)
          if (error) throw new Error(`matchup_snapshots read failed: ${error.message}`)
          if (!data || data.length === 0) break
          for (const r of data) {
            snapshots.push({
              matchupId: r.matchup_id,
              homeScore: Number(r.home_score),
              awayScore: Number(r.away_score),
              capturedAt: r.captured_at as string,
            })
          }
          if (data.length < PAGE) break
        }
      }

      // ---- movement down the table ----
      // ⚠️ SAME SOURCE AS THE STANDINGS PAGE, via rankedForWeek. This used to
      // call computeRankChange, which diffs our own engine — while the table
      // the league reads shows ESPN's seeds. Free Fallin' therefore named the
      // third-biggest faller as the biggest, and quoted a rank the standings
      // page disagreed with. Empty in week 1, which has no prior table.
      const standingsInput = awardMatchups.map((m) => ({
        week: m.week,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      }))
      const teamMetas = (teamRes.data ?? [])
        .map((t) => ({ seasonTeamId: t.id, name: t.team_name }))
      // Null when the two weeks cannot be ranked by one rulebook, in which
      // case Free Fallin' is withheld entirely — exactly as it is in week 1,
      // which has no prior table at all. An award quoting ranks the standings
      // page disagrees with is worse than no award.
      const rankChanges = rankMovementFor(
        standingsInput, teamMetas, week, seedHistory,
      )?.changes ?? []

      generated.push(
        await generateWeeklyAwards(
          seasonId, week, awardMatchups, players, transactions, slotCounts,
          snapshots, rankChanges,
          { regenerate: forced.includes(week) },
        ),
      )
    }

    const failed = generated.find((g) => !g.ok)
    return {
      ok: !failed,
      reason: decision.reason,
      generated,
      error: failed?.error,
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'release check failed',
      generated: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

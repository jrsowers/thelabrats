/**
 * One-off: stamp ESPN injury status onto weeks already recorded.
 *
 * ⚠️ APPROXIMATE FOR PAST WEEKS, AND THAT IS UNAVOIDABLE. ESPN reports a
 * player's CURRENT designation — there is no historical injury endpoint — so
 * this writes today's injury report onto weeks that are already settled. It is
 * close for the week just gone and progressively wrong going back.
 *
 * It only exists because `game_status` was null on every row ever written (the
 * boxscore player object has no injuryStatus field; only mRoster does), and the
 * records need *something* to exclude injured players with. From now on
 * syncRosters stamps the current week as it goes, which is accurate.
 *
 * RUN ONCE, 2026-09-22, against weeks 1-3. Kept in the repo because it is the
 * provenance of every non-null game_status on those weeks. Do NOT re-run it —
 * it would overwrite accurate week-of capture with a later injury report.
 *
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/backfill-injury-status.ts
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const leagueId = process.env.ESPN_LEAGUE_ID
  const season = process.env.ESPN_SEASON
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)

  const { data: seasonRow } = await db
    .from('seasons').select('id').order('year', { ascending: false }).limit(1).maybeSingle()
  const seasonId = seasonRow!.id

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}`
    + `/segments/0/leagues/${leagueId}?view=mRoster`
  const res = await fetch(url, {
    headers: { cookie: `SWID=${process.env.ESPN_SWID};espn_s2=${process.env.ESPN_S2}` },
  })
  if (!res.ok) throw new Error(`ESPN mRoster failed: ${res.status}`)
  const payload = await res.json() as {
    teams?: { roster?: { entries?: { playerPoolEntry?: { player?: { id?: number; fullName?: string; injuryStatus?: string } } }[] } }[]
  }

  const status = new Map<number, string>()
  for (const t of payload.teams ?? []) {
    for (const e of t.roster?.entries ?? []) {
      const p = e.playerPoolEntry?.player
      if (p?.id != null && p.injuryStatus) status.set(p.id, p.injuryStatus)
    }
  }
  console.log(`ESPN reports a status for ${status.size} rostered players.`)

  const { data: players } = await db.from('players').select('id, espn_player_id, full_name')
  const byId = new Map((players ?? []).map((p) => [p.id as number, p]))

  const { data: rows, error } = await db
    .from('player_week_scores')
    .select('id, week, player_id, game_status')
    .eq('season_id', seasonId)
  if (error) throw new Error(error.message)

  let written = 0
  const hurt: string[] = []
  for (const r of rows ?? []) {
    const p = byId.get(r.player_id as number)
    const s = p ? status.get(p.espn_player_id as number) : undefined
    if (!s) continue
    const { error: upErr } = await db
      .from('player_week_scores').update({ game_status: s }).eq('id', r.id)
    if (upErr) throw new Error(`update ${r.id}: ${upErr.message}`)
    written += 1
    if (s !== 'ACTIVE') hurt.push(`w${r.week} ${s.padEnd(15)} ${p!.full_name}`)
  }

  console.log(`\nStamped ${written} rows.`)
  console.log(`Non-ACTIVE (excluded from the two piling-on records):\n`)
  for (const h of [...new Set(hurt)].sort()) console.log('  ' + h)
}
void main()

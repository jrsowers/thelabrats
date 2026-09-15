/**
 * Everything the weekly recap needs from the league, in one pass.
 *
 *   set -a; . ./.env.local; set +a
 *   npx tsx .claude/skills/weekly-recap/scripts/gather.ts <week>
 *
 * Read-only. The recap is written from this output plus researched NFL news —
 * never from memory, and never from numbers invented to fit a joke.
 */
import { createClient } from '@supabase/supabase-js'

const WEEK = Number(process.argv[2] ?? 1)

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  const { data: season } = await db.from('seasons').select('id')
    .order('year', { ascending: false }).limit(1).maybeSingle()
  const seasonId = season!.id

  const { data: teams } = await db.from('season_teams')
    .select('id, team_name, franchises ( manager_name )').eq('season_id', seasonId)
  const label = new Map((teams ?? []).map((t) => {
    const f = t.franchises as unknown as { manager_name: string } | null
    return [t.id, `${t.team_name} (${f?.manager_name ?? '?'})`]
  }))
  const first = new Map((teams ?? []).map((t) => {
    const f = t.franchises as unknown as { manager_name: string } | null
    return [t.id, (f?.manager_name ?? '').split(' ')[0]]
  }))

  console.log(`=== WEEK ${WEEK} ===\n`)

  const { data: m } = await db.from('matchups')
    .select('home_team_id, away_team_id, home_score, away_score, status')
    .eq('season_id', seasonId).eq('week', WEEK).order('espn_matchup_id')
  console.log('MATCHUPS')
  for (const x of m ?? []) {
    const h = Number(x.home_score), a = Number(x.away_score)
    const margin = Math.abs(h - a).toFixed(1)
    console.log(`  ${label.get(x.home_team_id!)!.padEnd(38)} ${h.toFixed(1).padStart(6)} - ${a.toFixed(1).padEnd(6)} ${label.get(x.away_team_id!)!.padEnd(38)} (by ${margin}) ${x.status}`)
  }

  const { data: awards } = await db.from('awards')
    .select('award_type, award_name, recipient_team_id, score, headline, supporting_stats')
    .eq('season_id', seasonId).eq('week', WEEK).order('id')
  console.log(`\nAWARDS — the engine already found the week's stories. Do not contradict these.`)
  for (const a of (awards ?? []).filter((x) => !x.award_type.startsWith('position_king_'))) {
    console.log(`  ${a.award_name.padEnd(24)} ${String(label.get(a.recipient_team_id!)).padEnd(38)} ${a.headline}`)
  }
  console.log('\nPOSITION KINGS')
  for (const a of (awards ?? []).filter((x) => x.award_type.startsWith('position_king_'))) {
    const e = a.supporting_stats as { position?: string }
    console.log(`  ${String(e.position).padEnd(6)} ${a.headline?.padEnd(34)} ${label.get(a.recipient_team_id!)}`)
  }

  const { data: s } = await db.from('player_week_scores')
    .select('season_team_id, is_starter, lineup_slot, actual_points, projected_points, players ( full_name, position, nfl_team )')
    .eq('season_id', seasonId).eq('week', WEEK)
  type R = { season_team_id: number; is_starter: boolean; lineup_slot: string
    actual_points: number | null; projected_points: number | null
    players: { full_name: string; position: string; nfl_team: string } }
  const rows = (s ?? []) as unknown as R[]
  const line = (r: R) =>
    `${Number(r.actual_points).toFixed(1).padStart(6)} (proj ${Number(r.projected_points ?? 0).toFixed(1).padStart(5)})  ` +
    `${r.players.full_name.padEnd(22)} ${r.players.position.padEnd(5)} ${r.players.nfl_team.padEnd(4)} ${first.get(r.season_team_id)}`

  console.log('\nTOP STARTERS')
  rows.filter((r) => r.is_starter && r.actual_points != null)
    .sort((a, b) => Number(b.actual_points) - Number(a.actual_points)).slice(0, 12)
    .forEach((r) => console.log('  ' + line(r)))

  console.log('\nBUSTS (projected 12+, delivered under 6)')
  rows.filter((r) => r.is_starter && r.actual_points != null
      && Number(r.projected_points ?? 0) >= 12 && Number(r.actual_points) < 6)
    .sort((a, b) => Number(a.actual_points) - Number(b.actual_points))
    .forEach((r) => console.log('  ' + line(r)))

  console.log('\nBENCH SCORES OVER 15 — the "what were you thinking" list')
  rows.filter((r) => !r.is_starter && r.lineup_slot !== 'IR' && Number(r.actual_points ?? 0) > 15)
    .sort((a, b) => Number(b.actual_points) - Number(a.actual_points))
    .forEach((r) => console.log('  ' + line(r)))

  const { data: t } = await db.from('transactions')
    .select('transaction_type, season_team_id, transaction_items ( action, from_team_id, to_team_id, players ( full_name ) )')
    .eq('season_id', seasonId).eq('week', WEEK).eq('status', 'EXECUTED')
    .neq('transaction_type', 'DRAFT').neq('transaction_type', 'LINEUP')
  console.log('\nROSTER MOVES')
  for (const x of t ?? []) {
    const r = x as unknown as { transaction_type: string; season_team_id: number
      transaction_items: { action: string; from_team_id: number | null
        to_team_id: number | null; players: { full_name: string } | null }[] | null }
    // A TRADE's items are all action 'TRADE' and point BOTH ways — reading the
    // action alone renders every side of a two-for-two as a drop, which is how
    // a perfectly even deal first showed up here as one manager giving away
    // four players for nothing.
    const who = (r.transaction_items ?? [])
      .map((i) => {
        const gained = i.action === 'ADD' || i.to_team_id === r.season_team_id
        return `${gained ? '+' : '-'}${i.players?.full_name ?? '?'}`
      })
      .join(' ')
    console.log(`  ${String(first.get(r.season_team_id)).padEnd(10)} ${r.transaction_type.padEnd(12)} ${who}`)
  }
}
void main()

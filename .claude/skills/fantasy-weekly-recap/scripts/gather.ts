/**
 * Everything the weekly recap needs from the league, in one pass.
 *
 *   set -a; . ./.env.local; set +a
 *   npx tsx .claude/skills/fantasy-weekly-recap/scripts/gather.ts <week>
 *
 * Read-only. The recap is written from this output plus researched NFL news —
 * never from memory, and never from numbers invented to fit a joke.
 */
import { createClient } from '@supabase/supabase-js'
import { notesForWeek } from '../../../../src/content/league-notes'

const WEEK = Number(process.argv[2] ?? 1)

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  const { data: season } = await db.from('seasons').select('id, year')
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


  // ---- human notes ----
  // Things no query can find: a quarterback kneeling instead of scoring, a
  // starter rested at half time. Printed first and loudly, because the whole
  // reason this file exists is that somebody noticed something the pipeline
  // structurally cannot.
  const notes = notesForWeek(season!.year as number, WEEK)
  if (notes.length > 0) {
    console.log('\n\u2605 LEAGUE NOTES \u2014 human observations, read before writing\n')
    for (const n of notes) {
      console.log(`  [${n.source}] ${n.note.replace(/\n/g, '\n      ')}`)
      console.log(n.verified
        ? `      verified: ${n.verified}\n`
        : '      \u26a0\ufe0f  NOT VERIFIED \u2014 research before using\n')
    }
  }

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

  // ---------------------------------------------------------------- byes
  // ⚠️ READ THIS BEFORE WRITING A PREDICTION. Week 4 predicted that a kicker
  // "does not survive the week" while his team was on bye — a 0.00 projection
  // before a ball was kicked, down from 8.35. He was leaving that lineup no
  // matter what he had done. It would have been collected as a hit.
  //
  // A rostered player with a 0.00 projection for the week AHEAD is on bye.
  // Absence from the table is not the signal; the projection is, because the
  // roster row exists either way.
  const { data: next } = await db.from('player_week_scores')
    .select('season_team_id, is_starter, projected_points, players ( full_name, position, nfl_team )')
    .eq('season_id', seasonId).eq('week', WEEK + 1)
  //
  // A 0.00 projection alone is not enough — a deep bench player or a free agent
  // can carry one on a normal week. An NFL team is on bye when EVERY rostered
  // player of theirs projects zero, which no ordinary week produces.
  const nextRows = (next ?? []) as unknown as R[]
  const byTeam = new Map<string, { n: number; zero: number }>()
  for (const r of nextRows) {
    const k = r.players.nfl_team
    const acc = byTeam.get(k) ?? { n: 0, zero: 0 }
    acc.n += 1
    if (Number(r.projected_points ?? 0) === 0) acc.zero += 1
    byTeam.set(k, acc)
  }
  const onBye = new Set(
    [...byTeam.entries()]
      .filter(([team, a]) => team !== 'FA' && a.n > 0 && a.n === a.zero)
      .map(([team]) => team),
  )
  const byes = nextRows.filter((r) => onBye.has(r.players.nfl_team))
  if (byes.length > 0) {
    console.log(`\nON BYE IN WEEK ${WEEK + 1}: ${[...onBye].sort().join(', ')}`)
    console.log('  Anything you predict about these is forced by the schedule, not predicted.')
    for (const r of byes.sort((a, b) =>
      a.players.nfl_team.localeCompare(b.players.nfl_team)
      || Number(b.is_starter) - Number(a.is_starter))) {
      console.log(
        `  ${r.players.full_name.padEnd(22)} ${r.players.position.padEnd(5)} ` +
        `${r.players.nfl_team.padEnd(4)} ${r.is_starter ? 'STARTING' : 'bench   '} ` +
        `${first.get(r.season_team_id)}`)
    }
  }

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

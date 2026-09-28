/**
 * The state of an UNFINISHED week, from the league's point of view.
 *
 *   set -a; . ./.env.local; set +a
 *   npx tsx .claude/skills/fantasy-monday-miracles/scripts/gather.ts [week]
 *
 * Read-only. Where the recap's gather looks at a settled week, this one looks
 * at a week mid-flight, which is a different question with a different trap:
 * every number here MOVES. Nothing it prints should be written as though it is
 * final.
 *
 * ⚠️ `actual_points IS NULL` IS THE "HAS NOT PLAYED" SIGNAL. Not zero. A player
 * who suited up and did nothing scores 0.00, and treating that as "still to
 * come" would credit managers with points that have already failed to happen.
 * The transform writes null only when ESPN has no actual stat line for the
 * player, which is exactly the condition we want.
 *
 * ⚠️ WHEN ESPN'S TEAM PROJECTION DISAGREES WITH THE PLAYER SUM, WE ARE STALE.
 * This was first written up as "ESPN's projection is unreliable, trust the
 * players". That was backwards and it shipped a false statement to the league.
 * ESPN said James had 16.0 to come; our rows said 23.6. ESPN was right. The
 * extra 7.6 was Cairo Santos, a kicker James had dropped five days earlier
 * whose row the roster sync had never deleted.
 *
 * So the gap is not noise, it is an ALARM — the one signal available that the
 * stored roster no longer matches reality. It is checked below and printed
 * loudly, because a Monday post is built entirely on who is left, and being
 * wrong about that is being wrong about everything.
 */
import { createClient } from '@supabase/supabase-js'

const WEEK_ARG = process.argv[2] ? Number(process.argv[2]) : null

interface Side {
  teamId: number
  label: string
  manager: string
  current: number
  /** Starters with no stat line yet. */
  remaining: { name: string; position: string; nflTeam: string; projected: number }[]
}

const f = (n: number) => n.toFixed(1)
const sum = (s: Side) => s.remaining.reduce((n, p) => n + p.projected, 0)

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  const { data: season } = await db.from('seasons')
    .select('id, year, current_matchup_period')
    .order('year', { ascending: false }).limit(1).maybeSingle()
  const seasonId = season!.id
  const week = WEEK_ARG ?? (season!.current_matchup_period as number)

  const { data: teams } = await db.from('season_teams')
    .select('id, team_name, franchises ( manager_name )').eq('season_id', seasonId)
  const meta = new Map((teams ?? []).map((t) => {
    const fr = t.franchises as unknown as { manager_name: string } | null
    return [t.id, {
      label: t.team_name as string,
      manager: (fr?.manager_name ?? '').split(' ')[0] ?? '?',
    }]
  }))

  const { data: rows } = await db.from('player_week_scores')
    .select('season_team_id, is_starter, actual_points, projected_points, players ( full_name, position, nfl_team )')
    .eq('season_id', seasonId).eq('week', week)
  type PRow = {
    season_team_id: number; is_starter: boolean
    actual_points: number | null; projected_points: number | null
    players: { full_name: string; position: string; nfl_team: string }
  }
  const players = (rows ?? []) as unknown as PRow[]

  // Which NFL teams have not kicked off? If NOBODY rostered from a team has a
  // stat line, that team has not played. With 3-5 starters per NFL team across
  // twelve rosters this is reliable, and it is how the Monday game identifies
  // itself without us hard-coding a schedule.
  const byNfl = new Map<string, { total: number; played: number }>()
  for (const p of players) {
    const t = p.players.nfl_team
    if (!t || t === 'FA') continue
    const acc = byNfl.get(t) ?? { total: 0, played: 0 }
    acc.total += 1
    if (p.actual_points != null) acc.played += 1
    byNfl.set(t, acc)
  }
  const yetToPlay = [...byNfl.entries()]
    .filter(([, v]) => v.played === 0 && v.total > 0)
    .map(([t]) => t)
    .sort()

  // ⚠️ A NULL STAT LINE IS NOT ENOUGH ON ITS OWN. A starter whose NFL team has
  // already played but who never took the field — an inactive backup, a kicker
  // who was cut — also reads null, and counting him as "still to come" credits
  // a manager with points that can never arrive. The first run of this script
  // gave Keshia 24.1 to come when the real figure was 16.1, and handed three
  // managers defenses whose games had finished hours earlier.
  //
  // A player is genuinely still to play only if his NFL TEAM has not kicked off.
  const pending = new Set(yetToPlay)
  const remainingFor = (teamId: number) => players
    .filter((p) => p.season_team_id === teamId && p.is_starter
      && p.actual_points == null && pending.has(p.players.nfl_team))
    .map((p) => ({
      name: p.players.full_name,
      position: p.players.position,
      nflTeam: p.players.nfl_team,
      projected: Number(p.projected_points ?? 0),
    }))
    .sort((a, b) => b.projected - a.projected)

  const { data: matchups } = await db.from('matchups')
    .select('home_team_id, away_team_id, home_score, away_score, status, home_projected_score, away_projected_score')
    .eq('season_id', seasonId).eq('week', week).order('espn_matchup_id')

  // ---- staleness alarm ----
  // ESPN's live team projection should equal current score plus what its own
  // roster still has to play. If ours disagrees, our roster is out of date —
  // almost always a dropped player whose row was never pruned. Loud on purpose.
  const drift: string[] = []
  for (const m of matchups ?? []) {
    for (const [id, score, projected] of [
      [m.home_team_id, m.home_score, m.home_projected_score],
      [m.away_team_id, m.away_score, m.away_projected_score],
    ] as [number | null, number, number | null][]) {
      if (id == null || projected == null) continue
      const espnLeft = Number(projected) - Number(score)
      const ourLeft = remainingFor(id).reduce((n, p) => n + p.projected, 0)
      if (Math.abs(espnLeft - ourLeft) > 1) {
        drift.push(
          `  ${(meta.get(id)?.manager ?? '?').padEnd(9)} ESPN says ${f(espnLeft)} to come, our rows say ${f(ourLeft)}`,
        )
      }
    }
  }
  if (drift.length > 0) {
    console.log('\u26a0\ufe0f  ROSTER DATA LOOKS STALE \u2014 DO NOT PUBLISH UNTIL THIS IS EMPTY\n')
    console.log(drift.join('\n'))
    console.log('\n  Re-run the roster sync for this week, then run this again.\n')
  }

  console.log(`\n=== WEEK ${week}, IN FLIGHT ===`)
  console.log(`NFL teams yet to play: ${yetToPlay.join(', ') || '(none — the week is over)'}\n`)

  const side = (teamId: number, score: number): Side => ({
    teamId,
    label: meta.get(teamId)?.label ?? '?',
    manager: meta.get(teamId)?.manager ?? '?',
    current: Number(score),
    remaining: remainingFor(teamId),
  })

  for (const m of matchups ?? []) {
    const a = side(m.home_team_id as number, m.home_score as number)
    const b = side(m.away_team_id as number, m.away_score as number)
    const [lead, trail] = a.current >= b.current ? [a, b] : [b, a]
    const margin = lead.current - trail.current
    const leadLeft = sum(lead)
    const trailLeft = sum(trail)

    // Projected finish if everyone left hits their number exactly. NOT a
    // prediction — a yardstick for how much the deficit actually means.
    const projLead = lead.current + leadLeft
    const projTrail = trail.current + trailLeft

    let verdict: string
    if (leadLeft === 0 && trailLeft === 0) verdict = 'OVER — everyone has played'
    else if (trailLeft === 0) verdict = `LOCKED — ${trail.manager} has nobody left`
    else if (projTrail > projLead) verdict = `FLIPPING — ${trail.manager} projects to WIN by ${f(projTrail - projLead)}`
    else if (projLead - projTrail < 10) verdict = `KNIFE EDGE — projects to ${f(projLead - projTrail)}`
    else verdict = `${lead.manager} projects to hold by ${f(projLead - projTrail)}`

    console.log(`${lead.label} (${lead.manager}) ${f(lead.current)}  leads  ${trail.label} (${trail.manager}) ${f(trail.current)}   by ${f(margin)}`)
    console.log(`   ${verdict}`)
    for (const [who, s] of [[lead, leadLeft], [trail, trailLeft]] as [Side, number][]) {
      if (who.remaining.length === 0) { console.log(`   ${who.manager.padEnd(9)} nobody left`); continue }
      const list = who.remaining.map((p) => `${p.name} (${p.position} ${p.nflTeam}, ${f(p.projected)})`).join(', ')
      console.log(`   ${who.manager.padEnd(9)} ${f(s).padStart(5)} still to come  —  ${list}`)
    }
    console.log()
  }

  // Standings going in, so the stakes of each swing are visible.
  const { data: allM } = await db.from('matchups')
    .select('week, home_team_id, away_team_id, home_score, away_score, status')
    .eq('season_id', seasonId).lt('week', week)
  const rec = new Map<number, { w: number; l: number; pf: number }>()
  for (const m of allM ?? []) {
    if (m.status !== 'FINAL') continue
    for (const [id, mine, theirs] of [
      [m.home_team_id, m.home_score, m.away_score],
      [m.away_team_id, m.away_score, m.home_score],
    ] as [number, number, number][]) {
      const a = rec.get(id) ?? { w: 0, l: 0, pf: 0 }
      a.pf += Number(mine)
      if (Number(mine) > Number(theirs)) a.w += 1; else if (Number(mine) < Number(theirs)) a.l += 1
      rec.set(id, a)
    }
  }
  console.log('RECORDS GOING IN (before this week):')
  for (const [id, r] of [...rec.entries()].sort((x, y) => y[1].w - x[1].w || y[1].pf - x[1].pf)) {
    console.log(`  ${String(meta.get(id)?.manager).padEnd(9)} ${r.w}-${r.l}  PF ${f(r.pf)}`)
  }
}
void main()

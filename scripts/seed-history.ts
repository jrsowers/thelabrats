/**
 * Seeds the 2025 season result.
 *
 * Editorial data (§13): that season was played on Yahoo, so there is no ESPN
 * payload to ingest — now or ever. Idempotent, so it is safe to re-run when
 * more Yahoo history becomes available.
 *
 *   set -a; . ./.env.local; set +a && npm run seed:history
 */
import { createServiceClient } from '../src/lib/supabase/server'

const PODIUM = [
  { place: 1, teamName: 'Block Party Chenell',            managerName: 'Chenell Basilio', record: '8-6-0' },
  { place: 2, teamName: "Avery's Algorithmic All Stars",  managerName: 'Avery Smith',     record: null },
  { place: 3, teamName: "Jay's Forgotten NFTs",           managerName: 'Jay Clouse',      record: null },
]

async function main() {
  const db = createServiceClient()

  const { data: league } = await db.from('leagues').select('id').limit(1).single()
  const { data: franchises } = await db.from('franchises').select('id, manager_name')
  const byManager = new Map((franchises ?? []).map((f) => [f.manager_name, f.id]))

  const rows = PODIUM.map((p) => ({
    league_id: league!.id,
    year: 2025,
    place: p.place,
    team_name: p.teamName,
    manager_name: p.managerName,
    // Null where the manager has since left — Avery is not in the 2026 league.
    franchise_id: byManager.get(p.managerName) ?? null,
    record: p.record,
  }))

  const { error } = await db
    .from('season_podium')
    .upsert(rows, { onConflict: 'league_id,year,place' })
  if (error) throw error

  for (const r of rows) {
    console.log(
      `  ${r.place}. ${r.team_name.padEnd(30)} ${r.manager_name.padEnd(18)}` +
      `${r.franchise_id ? '→ linked' : '→ no longer in league'}`,
    )
  }

  const championFranchise = byManager.get('Chenell Basilio') ?? null
  if (!championFranchise) throw new Error('champion franchise not found')

  const { error: cErr } = await db.from('champions').upsert({
    league_id: league!.id,
    year: 2025,
    franchise_id: championFranchise,
    team_name: 'Block Party Chenell',
    record: '8-6-0',
    platform: 'Yahoo',
    title_game_opponent: "Avery's Algorithmic All Stars",
    title_game_score_for: 157.70,
    title_game_score_against: 138.12,
    note: 'Inaugural season',
  }, { onConflict: 'league_id,year' })
  if (cErr) throw cErr

  console.log('\n  champion: Chenell Basilio — 157.70 to 138.12')
  console.log('✅ 2025 history seeded')
}

void main()

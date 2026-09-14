import { createClient } from '@supabase/supabase-js'
import { decideRelease } from '../src/lib/awards/release'

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  console.log('now:', new Date().toISOString())

  const { data: m } = await db.from('matchups')
    .select('espn_matchup_id, home_score, away_score, status, winner_team_id, score_changed_at')
    .eq('season_id', 4).eq('week', 1).order('espn_matchup_id')
  console.table(m)

  const { count: pws } = await db.from('player_week_scores').select('id', { count: 'exact', head: true })
    .eq('season_id', 4).eq('week', 1)
  const { count: withActual } = await db.from('player_week_scores').select('id', { count: 'exact', head: true })
    .eq('season_id', 4).eq('week', 1).not('actual_points', 'is', null)
  const { data: elig } = await db.from('player_week_scores').select('eligible_slots')
    .eq('season_id', 4).eq('week', 1)
  const noElig = (elig ?? []).filter((r) => !r.eligible_slots || r.eligible_slots.length === 0).length

  const { count: txns } = await db.from('transactions').select('id', { count: 'exact', head: true })
    .eq('season_id', 4).eq('week', 1).eq('status', 'EXECUTED').neq('transaction_type', 'DRAFT')
  const { count: awards } = await db.from('awards').select('id', { count: 'exact', head: true })
  const { data: season } = await db.from('seasons').select('lineup_slot_counts').eq('id', 4).maybeSingle()
  const { data: run } = await db.from('sync_runs').select('sync_type, finished_at')
    .order('started_at', { ascending: false }).limit(1).maybeSingle()

  console.log('player rows:', pws, '| with a real stat line:', withActual, '| missing eligibility:', noElig)
  console.log('executed non-draft transactions:', txns)
  console.log('lineup slots:', JSON.stringify(season?.lineup_slot_counts))
  console.log('awards rows:', awards)
  console.log('last sync:', run?.sync_type, run?.finished_at)

  // What the release gate says right now, and what it will say Tuesday.
  const byWeek = new Map<number, { total: number; final: number }>()
  const { data: all } = await db.from('matchups').select('week, status').eq('season_id', 4)
  for (const x of all ?? []) {
    const a = byWeek.get(x.week!) ?? { total: 0, final: 0 }
    a.total++; if (x.status === 'FINAL') a.final++
    byWeek.set(x.week!, a)
  }
  const finalWeeks = [...byWeek.entries()].filter(([, a]) => a.total === a.final).map(([w]) => w)
  console.log('\nweeks fully FINAL:', finalWeeks)
  console.log('gate now      :', JSON.stringify(decideRelease({ now: new Date(), finalWeeks, generatedWeeks: [] })))
  console.log('gate Tue 6:05 :', JSON.stringify(decideRelease({ now: new Date('2026-09-15T10:05:00Z'), finalWeeks: [1], generatedWeeks: [] })))
}
void main()

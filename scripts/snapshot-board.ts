/**
 * Snapshots the league's draft board to fixtures/draft-board.json.
 *
 * Run this the morning of the draft. Once it exists nothing touches the network
 * during the draft itself — James's call, and the right one: a lookup inside a
 * 60-second pick window is the fragile part.
 *
 *   npx tsx scripts/snapshot-board.ts
 */
import { writeFileSync } from 'node:fs'
import { buildBoard, type ProjectedPlayer } from '../src/lib/draft/board'
import { proTeamOf } from '../src/lib/draft/pro-teams'
import type { DraftablePlayer } from '../src/lib/draft/types'

const LEAGUE = process.env.ESPN_LEAGUE_ID ?? '793230160'
const SEASON = process.env.ESPN_SEASON ?? '2026'
const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE}`

const POS: Record<number, DraftablePlayer['pos']> =
  { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST' }
const SLOT_POS: Record<string, string> = { '0': 'QB', '2': 'RB', '4': 'WR', '6': 'TE', '16': 'DST', '17': 'K' }

async function main() {
  const settings = await fetch(`${BASE}?view=mSettings`).then((r) => r.json())
  const slots = settings.settings.rosterSettings.lineupSlotCounts as Record<string, number>

  const starters: Record<string, number> = {}
  for (const [slot, n] of Object.entries(slots)) {
    const pos = SLOT_POS[slot]
    if (pos && n > 0) starters[pos] = n
  }
  const superflexSlots = slots['7'] ?? 0
  const flexSlots = slots['23'] ?? 0
  const teams = settings.settings.size ?? 12

  const filter = JSON.stringify({
    players: { limit: 1500, sortPercOwned: { sortAsc: false, sortPriority: 1 } },
  })
  const pool = await fetch(`${BASE}?view=kona_player_info`, {
    headers: { 'x-fantasy-filter': filter },
  }).then((r) => r.json())

  const players: ProjectedPlayer[] = []
  for (const w of pool.players) {
    const p = w.player
    const pos = POS[p.defaultPositionId]
    if (!pos) continue
    // Full-season projection, scored with THIS league's rules (verified: only
    // reconciles with 6-point passing TDs, which is this league's setting).
    const proj = (p.stats ?? []).find(
      (s: { seasonId: number; scoringPeriodId: number; statSourceId: number }) =>
        s.seasonId === Number(SEASON) && s.scoringPeriodId === 0 && s.statSourceId === 1,
    )
    players.push({
      id: p.id,
      name: p.fullName,
      pos,
      proTeam: proTeamOf(p.proTeamId),
      projectedPoints: proj?.appliedTotal ?? 0,
      adp: p.ownership?.averageDraftPosition ?? 9999,
      injuryStatus: p.injuryStatus ?? null,
      // ESPN's own analyst blurb. This is the richest source of PLAYER
      // character available — age, injury history, role changes, whether he
      // has ever actually done it — and the roasts were duller for not having
      // it. Trimmed because only the first couple of sentences carry the story.
      outlook: (p.seasonOutlook ?? '').trim().slice(0, 420) || null,
    })
  }

  const board = buildBoard(players, { teams, starters, superflexSlots, flexSlots })

  writeFileSync('fixtures/draft-board.json', JSON.stringify({
    _note: 'League-specific board: VOR from ESPN projections scored by THIS league. Public NFL players only.',
    capturedAt: new Date().toISOString(),
    season: Number(SEASON),
    league: { teams, starters, superflexSlots, flexSlots },
    players: board.map((p) => ({
      id: p.id, name: p.name, pos: p.pos, proTeam: p.proTeam,
      leagueRank: p.leagueRank, vor: Math.round(p.vor * 10) / 10,
      projectedPoints: Math.round(p.projectedPoints * 10) / 10,
      adp: p.adp, injuryStatus: p.injuryStatus,
      // Only for players anyone will actually draft; the tail is dead weight.
      outlook: p.leagueRank <= 400 ? p.outlook : null,
    })),
  }, null, 1) + '\n')

  console.log(`captured ${board.length} players`)
  console.log(`starters:`, starters, `superflex:${superflexSlots} flex:${flexSlots} teams:${teams}`)
  console.log('\ntop 15 on THIS league\'s board:')
  for (const p of board.slice(0, 15)) {
    console.log(`  ${String(p.leagueRank).padStart(2)}. ${p.name.padEnd(24)} ${p.pos.padEnd(4)} ` +
      `proj ${p.projectedPoints.toFixed(0).padStart(4)}  VOR ${p.vor.toFixed(0).padStart(4)}  adp ${p.adp}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })

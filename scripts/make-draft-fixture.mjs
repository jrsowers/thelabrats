/**
 * Builds a HYPOTHESISED completed draft from the REAL pre-draft skeleton.
 *
 * 2025 was on Yahoo, so this league has no finished ESPN draft to capture.
 * Rather than invent the payload shape, this takes the real 180-pick skeleton
 * from fixtures/mDraftDetail.json and fills in playerId using real player IDs
 * and real SUPERFLEX ranks from the player pool.
 *
 * Deliberately seeded with reaches and steals so the analysis engine has
 * something to find. Deterministic — no Math.random, so the fixture is stable.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const skeleton = JSON.parse(readFileSync('fixtures/mDraftDetail.json', 'utf8'))
const pool = JSON.parse(readFileSync('fixtures/draft-board.json', 'utf8'))


// The board is already ranked for THIS league (VOR from league-scored
// projections), so a realistic simulated draft just walks down it.
const players = pool.players
  .map((p) => ({ id: p.id, name: p.name, pos: p.pos, sfRank: p.leagueRank, adp: p.adp }))
  .sort((a, b) => a.sfRank - b.sfRank)

// A tiny deterministic PRNG so the fixture never changes between runs.
let seed = 20260903
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

const available = [...players]
const picks = skeleton.draftDetail.picks.map((p) => ({ ...p }))

// Kickers and defences sit around rank 950 on our board, so a pure
// best-available walk never reaches them in 180 picks — yet every real team
// MUST draft both, since each is a required starting slot. Rounds 14 and 15
// are reserved for them, which is roughly what real drafts do and is the only
// way the early-kicker and first-defence roasts ever get exercised.
const RESERVED = { 14: 'DST', 15: 'K' }

for (const pick of picks) {
  const forced = RESERVED[pick.roundId]
  if (forced) {
    const idx = available.findIndex((p) => p.pos === forced)
    if (idx >= 0) {
      const chosen = available.splice(idx, 1)[0]
      pick.playerId = chosen.id
      pick.lineupSlotId = 20
      continue
    }
  }

  // Mostly best-available, but reach down the board often enough to be funny.
  const roll = rnd()
  const depth = roll < 0.12 ? Math.floor(rnd() * 28) + 4   // a real reach
              : roll < 0.30 ? Math.floor(rnd() * 8) + 1    // mild reach
              : 0                                          // best available
  const idx = Math.min(depth, available.length - 1)
  const chosen = available.splice(idx, 1)[0]
  if (!chosen) continue
  pick.playerId = chosen.id
  pick.lineupSlotId = 20
}

// Write the MUTATED picks back. Serialising `skeleton` alone silently emits
// the untouched originals, since `picks` is an array of copies.
skeleton.draftDetail.picks = picks
skeleton.draftDetail.drafted = true
skeleton.draftDetail.inProgress = false
writeFileSync('fixtures/hypothesised/mDraftDetail-populated.json', JSON.stringify(skeleton, null, 2) + '\n')

const byId = new Map(players.map((p) => [p.id, p]))
console.log(`wrote ${picks.length} picks`)
console.log('first round:')
for (const p of picks.filter((x) => x.roundId === 1)) {
  const pl = byId.get(p.playerId)
  console.log(`  ${String(p.overallPickNumber).padStart(3)}. team ${String(p.teamId).padStart(2)}  ${pl.name} (${pl.pos})  sfRank ${pl.sfRank}  adp ${pl.adp}`)
}

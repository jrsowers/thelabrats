/**
 * Backfills playerId, managerFull and managerPhoto onto an existing feed.
 *
 * Written so adding those fields did not mean regenerating — and re-billing —
 * sixty roasts that were already reviewed.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { buildTeamMeta } from '../src/lib/draft/teams'
import { memberPhotoFor } from '../src/lib/draft/feed-data'

const FEED = 'fixtures/sample-draft-feed.json'
const feed = JSON.parse(readFileSync(FEED, 'utf8'))
const board = JSON.parse(readFileSync('fixtures/draft-board.json', 'utf8'))
const teamsRaw = JSON.parse(readFileSync('fixtures/league-teams.json', 'utf8'))

const idByName = new Map<string, number>(board.players.map((p: { name: string; id: number }) => [p.name, p.id]))
const teams = buildTeamMeta(teamsRaw.teams, teamsRaw.members)

let missing = 0
feed.picks = feed.picks.map((p: Record<string, unknown>) => {
  const meta = teams.get(p.teamId as number)
  const id = idByName.get(p.player as string)
  if (id === undefined) missing++
  return {
    ...p,
    playerId: id ?? 0,
    managerFull: meta?.manager ?? (p.manager as string),
    managerPhoto: meta ? memberPhotoFor(meta.manager) : null,
  }
})
writeFileSync(FEED, JSON.stringify(feed, null, 1) + '\n')
console.log(`enriched ${feed.picks.length} picks, ${missing} without a player id`)
const roasts = feed.picks.filter((p: { roast: unknown }) => p.roast).length
console.log(`roasts preserved: ${roasts}`)

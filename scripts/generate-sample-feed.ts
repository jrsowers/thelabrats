/**
 * Generates a realistic sample draft feed from the hypothesised draft.
 *
 * Used to build and review the /draft pages before Thursday. Everything it
 * writes is labelled SAMPLE and is replaced by the live runner on draft day.
 *
 *   npx tsx scripts/generate-sample-feed.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { analyzeDraft } from '../src/lib/draft/analyze'
import { scheduleRoasts } from '../src/lib/draft/schedule'
import { buildTeamMeta } from '../src/lib/draft/teams'
import { writeRoasts } from '../src/lib/draft/writer'
import { loadDossier } from '../src/lib/draft/dossier'
import { memberPhotoFor } from '../src/lib/draft/feed-data'
import type { DraftablePlayer } from '../src/lib/draft/types'

const BATCH = 10

async function main() {
  const draft = JSON.parse(readFileSync('fixtures/hypothesised/mDraftDetail-populated.json', 'utf8'))
  const board = JSON.parse(readFileSync('fixtures/draft-board.json', 'utf8'))
  const teamsRaw = JSON.parse(readFileSync('fixtures/league-teams.json', 'utf8'))

  const playersById = new Map<number, DraftablePlayer>()
  for (const p of board.players) {
    playersById.set(p.id, { id: p.id, name: p.name, pos: p.pos, proTeam: p.proTeam,
      leagueRank: p.leagueRank, adp: p.adp, injuryStatus: p.injuryStatus ?? null })
  }
  const teamsById = buildTeamMeta(teamsRaw.teams, teamsRaw.members)
  const dossier = loadDossier()

  const all = analyzeDraft({ picks: draft.draftDetail.picks, playersById, teamsById, totalRounds: 15 })
  const sched = scheduleRoasts(all, { totalRounds: 15, dossierNames: new Set(dossier.keys()) })

  const written: { overallPickNumber: number; text: string; theme: string; fallback: boolean }[] = []
  const previous: string[] = []

  for (let i = 0; i < sched.length; i += BATCH) {
    const batch = sched.slice(i, i + BATCH)
    process.stdout.write(`  batch ${i / BATCH + 1}/${Math.ceil(sched.length / BATCH)}... `)
    const out = await writeRoasts(batch, { dossier, previous })
    written.push(...out)
    previous.push(...out.filter((o) => !o.fallback).map((o) => o.text))
    console.log(`${out.filter((o) => !o.fallback).length}/${out.length} written`)
  }

  const roastByPick = new Map(written.map((w) => [w.overallPickNumber, w]))

  writeFileSync('fixtures/sample-draft-feed.json', JSON.stringify({
    _note: 'SAMPLE. Generated from the hypothesised draft so the pages can be built and reviewed before Thursday. Replaced by live data on draft day.',
    sample: true,
    generatedAt: new Date().toISOString(),
    picks: all.map((p) => {
      const r = roastByPick.get(p.overallPickNumber)
      return {
        overallPickNumber: p.overallPickNumber,
        round: p.round, roundPick: p.roundPick,
        teamId: p.team.teamId, teamName: p.team.teamName, manager: p.team.managerFirst,
        managerFull: p.team.manager, managerPhoto: memberPhotoFor(p.team.manager),
        playerId: p.player.id,
        player: p.player.name, position: p.player.pos, proTeam: p.player.proTeam,
        leagueRank: p.player.leagueRank, adp: p.player.adp,
        reachSlots: p.reachSlots, betterAvailable: p.betterAvailable,
        roast: r ? { text: r.text, theme: r.theme, fallback: r.fallback } : null,
      }
    }),
  }, null, 1) + '\n')

  const fb = written.filter((w) => w.fallback).length
  console.log(`\nwrote ${all.length} picks, ${written.length} roasts (${fb} fallbacks)`)
}
main().catch((e) => { console.error(e); process.exit(1) })

/**
 * Loads the sample feed fixture into Postgres, flagged is_sample.
 *
 * Exists so switching the read path to the database did not mean regenerating
 * — and re-billing — sixty roasts that were already reviewed.
 *
 *   npx tsx scripts/seed-draft-sample.ts            # whole draft, complete
 *   npx tsx scripts/seed-draft-sample.ts --unmade 8 # leave 8 slots open
 */
import { readFileSync } from 'node:fs'
import { publishDraft, type PublishRow } from '../src/lib/draft/publish'
import { buildTeamMeta } from '../src/lib/draft/teams'
import type { PickAnalysis } from '../src/lib/draft/types'

const SEASON = Number(process.env.ESPN_SEASON ?? 2026)
const i = process.argv.indexOf('--unmade')
const UNMADE = i >= 0 ? Number(process.argv[i + 1] ?? 0) : 0

async function main() {
  const feed = JSON.parse(readFileSync('fixtures/sample-draft-feed.json', 'utf8'))
  const teamsRaw = JSON.parse(readFileSync('fixtures/league-teams.json', 'utf8'))
  const teams = buildTeamMeta(teamsRaw.teams, teamsRaw.members)

  const picks = feed.picks as Record<string, unknown>[]
  const cutoff = picks.length - UNMADE

  const rows: PublishRow[] = picks.map((p) => {
    const team = teams.get(p.teamId as number)!
    const made = (p.overallPickNumber as number) <= cutoff
    const roast = p.roast as { text: string; theme: string; fallback: boolean } | null

    const analysis = made
      ? ({
          player: {
            id: p.playerId as number, name: p.player as string,
            pos: p.position as PickAnalysis['player']['pos'],
            proTeam: p.proTeam as string | null,
            leagueRank: p.leagueRank as number, adp: p.adp as number,
            injuryStatus: null,
          },
          reachSlots: p.reachSlots as number,
          betterAvailable: p.betterAvailable as number,
        } as PickAnalysis)
      : null

    return {
      overallPickNumber: p.overallPickNumber as number,
      round: p.round as number,
      roundPick: p.roundPick as number,
      team,
      analysis,
      roast: made ? roast : null,
    }
  })

  const n = await publishDraft(rows, { season: SEASON, sample: true })
  const made = rows.filter((r) => r.analysis).length
  console.log(`seeded ${n} slots — ${made} made, ${rows.length - made} open`)
}
main().catch((e) => { console.error(e); process.exit(1) })

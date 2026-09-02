/**
 * The live draft runner.
 *
 * Polls ESPN, roasts new picks as they land, and writes the feed to disk so
 * /draft renders it. Run it from a terminal on draft day:
 *
 *   npx tsx scripts/draft-live.ts
 *   npx tsx scripts/draft-live.ts --dry     (no Claude calls, templates only)
 *   npx tsx scripts/draft-live.ts --replay  (simulate from the fixture)
 *
 * Safe to kill and restart. ESPN's picks are CUMULATIVE STATE rather than an
 * event stream, so a restart re-reads everything that has happened; nothing is
 * lost by going down for a few minutes. Roasts already written are kept, so a
 * restart does not re-bill or re-word them.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { analyzeDraft } from '../src/lib/draft/analyze'
import { scheduleRoasts } from '../src/lib/draft/schedule'
import { buildTeamMeta } from '../src/lib/draft/teams'
import { writeRoasts } from '../src/lib/draft/writer'
import { loadDossier } from '../src/lib/draft/dossier'
import type { DraftablePlayer, RawPick } from '../src/lib/draft/types'
import { memberPhotoFor } from '../src/lib/draft/feed-data'

const LEAGUE = process.env.ESPN_LEAGUE_ID ?? '793230160'
const SEASON = process.env.ESPN_SEASON ?? '2026'
const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE}`
const OUT = 'fixtures/sample-draft-feed.json'
const POLL_MS = 15_000
const DRY = process.argv.includes('--dry')
const REPLAY = process.argv.includes('--replay')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const stamp = () => new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })

interface StoredRoast { text: string; theme: string; fallback: boolean }

function loadBoard(): Map<number, DraftablePlayer> {
  const board = JSON.parse(readFileSync('fixtures/draft-board.json', 'utf8'))
  const m = new Map<number, DraftablePlayer>()
  for (const p of board.players) {
    m.set(p.id, { id: p.id, name: p.name, pos: p.pos, proTeam: p.proTeam,
      leagueRank: p.leagueRank, adp: p.adp, injuryStatus: p.injuryStatus ?? null })
  }
  return m
}

/**
 * Keeps roasts already written, so a restart neither re-bills nor re-words.
 *
 * REFUSES to resume from a sample feed. Roasts are keyed by overall pick
 * number, and the sample was generated from a simulated draft — resuming from
 * it would attach the sample's roast for pick 1 to whoever really goes 1.01.
 * Only a genuine live capture is resumable.
 */
function loadExistingRoasts(): Map<number, StoredRoast> {
  if (!existsSync(OUT)) return new Map()
  try {
    const raw = JSON.parse(readFileSync(OUT, 'utf8')) as {
      sample?: boolean
      picks?: { overallPickNumber: number; roast: StoredRoast | null }[]
    }
    if (raw.sample !== false) {
      console.log(`[${stamp()}] existing feed is sample data — starting clean`)
      return new Map()
    }
    return new Map((raw.picks ?? []).filter((p) => p.roast).map((p) => [p.overallPickNumber, p.roast!]))
  } catch { return new Map() }
}

async function fetchDraft(): Promise<{ picks: RawPick[]; drafted: boolean; inProgress: boolean }> {
  if (REPLAY) {
    const f = JSON.parse(readFileSync('fixtures/hypothesised/mDraftDetail-populated.json', 'utf8'))
    return { picks: f.draftDetail.picks, drafted: true, inProgress: false }
  }
  const res = await fetch(`${BASE}?view=mDraftDetail`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN returned ${res.status}`)
  const d = await res.json()
  return { picks: d.draftDetail?.picks ?? [], drafted: !!d.draftDetail?.drafted, inProgress: !!d.draftDetail?.inProgress }
}

async function main() {
  console.log(`[${stamp()}] draft runner starting${DRY ? ' (dry)' : ''}${REPLAY ? ' (replay)' : ''}`)

  const playersById = loadBoard()
  const teamsRaw = JSON.parse(readFileSync('fixtures/league-teams.json', 'utf8'))
  const teamsById = buildTeamMeta(teamsRaw.teams, teamsRaw.members)
  const dossier = loadDossier()
  const dossierNames = new Set(dossier.keys())
  const roasts = loadExistingRoasts()
  if (roasts.size) console.log(`[${stamp()}] resuming with ${roasts.size} roasts already written`)

  let lastCount = -1

  for (;;) {
    let state
    try {
      state = await fetchDraft()
    } catch (err) {
      // ESPN blipping must never end the run. Wait and try again.
      console.error(`[${stamp()}] poll failed: ${(err as Error).message}`)
      await sleep(POLL_MS)
      continue
    }

    const made = state.picks.filter((p) => p.playerId !== -1)
    if (made.length !== lastCount) {
      lastCount = made.length
      const all = analyzeDraft({ picks: state.picks, playersById, teamsById, totalRounds: 15 })

      // Schedule across everything made so far, then write only what is new.
      const scheduled = scheduleRoasts(all, { totalRounds: 15, dossierNames })
      const pending = scheduled.filter((s) => !roasts.has(s.pick.overallPickNumber))

      if (pending.length > 0) {
        const previous = [...roasts.values()].slice(-8).map((r) => r.text)
        const written = DRY
          ? pending.map((s) => ({ overallPickNumber: s.pick.overallPickNumber,
              text: `[dry] ${s.theme} — ${s.pick.player.name}`, theme: s.theme, fallback: true }))
          : await writeRoasts(pending, { dossier, previous })
        for (const w of written) {
          roasts.set(w.overallPickNumber, { text: w.text, theme: w.theme, fallback: w.fallback })
        }
        console.log(`[${stamp()}] ${made.length}/180 picks · wrote ${written.length} roast(s)`)
      } else {
        console.log(`[${stamp()}] ${made.length}/180 picks · nothing new to roast`)
      }

      writeFileSync(OUT, JSON.stringify({
        _note: state.drafted
          ? 'Live capture of the real draft.'
          : 'Live capture, draft in progress.',
        sample: false,
        generatedAt: new Date().toISOString(),
        picks: all.map((p) => {
          const r = roasts.get(p.overallPickNumber) ?? null
          return {
            overallPickNumber: p.overallPickNumber, round: p.round, roundPick: p.roundPick,
            teamId: p.team.teamId, teamName: p.team.teamName, manager: p.team.managerFirst,
            managerFull: p.team.manager, managerPhoto: memberPhotoFor(p.team.manager),
            playerId: p.player.id,
            player: p.player.name, position: p.player.pos, proTeam: p.player.proTeam,
            leagueRank: p.player.leagueRank, adp: p.player.adp,
            reachSlots: p.reachSlots, betterAvailable: p.betterAvailable, roast: r,
          }
        }),
      }, null, 1) + '\n')
    }

    if (state.drafted && made.length >= 180) {
      console.log(`[${stamp()}] draft complete — ${roasts.size} roasts written`)
      console.log('Next: npx tsx scripts/generate-sample-recap.ts')
      return
    }
    await sleep(POLL_MS)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })

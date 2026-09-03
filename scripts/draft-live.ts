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
import { readFileSync } from 'node:fs'
import { analyzeDraft } from '../src/lib/draft/analyze'
import { scheduleRoasts } from '../src/lib/draft/schedule'
import { buildTeamMeta } from '../src/lib/draft/teams'
import { writeRoasts } from '../src/lib/draft/writer'
import { loadDossier } from '../src/lib/draft/dossier'
import { createServiceClient } from '../src/lib/supabase/server'
import type { DraftablePlayer, RawPick } from '../src/lib/draft/types'
import { publishDraft, type PublishRow } from '../src/lib/draft/publish'

const LEAGUE = process.env.ESPN_LEAGUE_ID ?? '793230160'
const SEASON = process.env.ESPN_SEASON ?? '2026'
const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE}`
const SEASON_NUM = Number(SEASON)
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
      leagueRank: p.leagueRank, adp: p.adp, injuryStatus: p.injuryStatus ?? null, outlook: p.outlook ?? null })
  }
  return m
}

/**
 * Roasts already written, read back from Postgres so a restart neither re-bills
 * nor re-words them. Sample rows are ignored: they are keyed by pick number, so
 * resuming from them would attach a simulated draft's joke to whoever really
 * went 1.01.
 */
async function loadExistingRoasts(): Promise<Map<number, StoredRoast>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('draft_picks')
    .select('overall_pick, roast_text, roast_theme, roast_fallback, is_sample')
    .eq('season', SEASON_NUM)
  if (error || !data) return new Map()

  const out = new Map<number, StoredRoast>()
  for (const r of data as unknown as {
    overall_pick: number; roast_text: string | null
    roast_theme: string | null; roast_fallback: boolean; is_sample: boolean
  }[]) {
    if (r.is_sample || !r.roast_text) continue
    out.set(r.overall_pick, {
      text: r.roast_text, theme: r.roast_theme ?? '', fallback: r.roast_fallback,
    })
  }
  return out
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
  const roasts = await loadExistingRoasts()
  if (roasts.size) console.log(`[${stamp()}] resuming with ${roasts.size} roasts already written`)

  let lastCount = -1
  // A heartbeat every few minutes. Without it the log is silent whenever the
  // pick count has not moved, which over a three-hour wait makes a live runner
  // indistinguishable from a dead one.
  let lastBeat = 0
  const BEAT_MS = 5 * 60_000

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

        // Rebuild each manager's own history so running bits survive a restart.
        const historyByManager = new Map<string, string[]>()
        for (const a of all) {
          const r = roasts.get(a.overallPickNumber)
          if (!r || r.fallback) continue
          const who = a.team.managerFirst
          historyByManager.set(who, [...(historyByManager.get(who) ?? []), r.text])
        }
        const written = DRY
          ? pending.map((s) => ({ overallPickNumber: s.pick.overallPickNumber,
              text: `[dry] ${s.theme} — ${s.pick.player.name}`, theme: s.theme, fallback: true }))
          : await writeRoasts(pending, { dossier, previous, historyByManager })
        for (const w of written) {
          roasts.set(w.overallPickNumber, { text: w.text, theme: w.theme, fallback: w.fallback })
        }
        console.log(`[${stamp()}] ${made.length}/180 picks · wrote ${written.length} roast(s)`)
      } else {
        console.log(`[${stamp()}] ${made.length}/180 picks · nothing new to roast`)
      }

      // Every slot, used or not — an unmade pick is a null player, not a
      // missing row, which is what lets the page say who is on the clock.
      const byPick = new Map(all.map((a) => [a.overallPickNumber, a]))
      const rows: PublishRow[] = state.picks
        .sort((a, b) => a.overallPickNumber - b.overallPickNumber)
        .map((p) => {
          const analysis = byPick.get(p.overallPickNumber) ?? null
          const team = teamsById.get(p.teamId)
          if (!team) return null
          return {
            overallPickNumber: p.overallPickNumber,
            round: p.roundId,
            roundPick: p.roundPickNumber,
            team,
            analysis,
            roast: roasts.get(p.overallPickNumber) ?? null,
          }
        })
        .filter((r): r is PublishRow => r !== null)

      try {
        const n = await publishDraft(rows, { season: SEASON_NUM, sample: false })
        console.log(`[${stamp()}] published ${n} rows`)
      } catch (err) {
        // A publish failure must not end the run; the next poll retries with
        // everything, because picks are cumulative.
        console.error(`[${stamp()}] publish failed: ${(err as Error).message}`)
      }
    }

    if (Date.now() - lastBeat > BEAT_MS) {
      lastBeat = Date.now()
      console.log(`[${stamp()}] alive · ${made.length}/180 picks · ` +
        `drafted=${state.drafted} inProgress=${state.inProgress} · ${roasts.size} roasts written`)
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

/**
 * Watches ESPN's draft endpoint and reports the moment anything changes.
 *
 * Exists to answer the one question the build could not: does ESPN populate
 * playerId DURING a draft, or only when it finishes? The `inProgress` flag
 * implies live, but 2025 was on Yahoo so there is no finished ESPN draft in
 * this league to check against.
 *
 *   npx tsx scripts/probe-draft.ts                 # the real league
 *   npx tsx scripts/probe-draft.ts --league 12345  # a practice draft's id
 *
 * Read-only. Touches nothing, writes nothing, publishes nothing.
 */
const args = process.argv
const at = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined }

const LEAGUE = at('--league') ?? process.env.ESPN_LEAGUE_ID ?? '793230160'
const SEASON = at('--season') ?? process.env.ESPN_SEASON ?? '2026'
const SEGMENT = at('--segment') ?? '0'
const EVERY = Number(at('--every') ?? 5) * 1000

const ENDPOINT = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/${SEGMENT}/leagues/${LEAGUE}?view=mDraftDetail`
const now = () => new Date().toLocaleTimeString('en-US', { hour12: false })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log(`watching league ${LEAGUE} (season ${SEASON}, segment ${SEGMENT}) every ${EVERY / 1000}s`)
  console.log(ENDPOINT + '\n')

  let last = ''
  for (;;) {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' })
      if (!res.ok) { console.log(`[${now()}] HTTP ${res.status}`); await sleep(EVERY); continue }
      const d = await res.json()
      const dd = d.draftDetail
      if (!dd) { console.log(`[${now()}] no draftDetail on this league`); await sleep(EVERY); continue }

      const made = (dd.picks ?? []).filter((p: { playerId: number }) => p.playerId !== -1)
      const line = `drafted=${dd.drafted} inProgress=${dd.inProgress} made=${made.length}/${(dd.picks ?? []).length}`

      if (line !== last) {
        console.log(`[${now()}] ${line}`)
        const latest = made[made.length - 1]
        if (latest) {
          console.log(`          latest -> pick ${latest.overallPickNumber} ` +
            `(R${latest.roundId}.${latest.roundPickNumber}) team ${latest.teamId} player ${latest.playerId}`)
        }
        last = line
      } else {
        process.stdout.write('.')
      }
    } catch (err) {
      console.log(`[${now()}] error: ${(err as Error).message}`)
    }
    await sleep(EVERY)
  }
}
main()

export {}

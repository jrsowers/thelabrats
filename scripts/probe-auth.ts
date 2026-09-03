/**
 * Tries the authenticated ESPN endpoints for live draft picks.
 *
 * The read replica publishes nothing while a draft is running — verified on the
 * day across draftDetail, rosters, transactions and player ownership. The draft
 * room itself clearly sees the picks, so this checks whether an authenticated
 * request to the same league can see what the room sees.
 *
 * Reads ESPN_SWID and ESPN_S2 from .env.local. Read-only; publishes nothing.
 */
const SWID = process.env.ESPN_SWID ?? ''
const S2 = process.env.ESPN_S2 ?? ''
const LEAGUE = process.env.ESPN_LEAGUE_ID ?? '793230160'
const SEASON = process.env.ESPN_SEASON ?? '2026'

const HOSTS = [
  'https://lm-api-reads.fantasy.espn.com',
  'https://fantasy.espn.com',
]

async function tryOne(host: string, view: string, withAuth: boolean) {
  const url = `${host}/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE}` +
    `?view=${view}&_=${Date.now()}`
  const headers: Record<string, string> = { 'Cache-Control': 'no-cache' }
  if (withAuth) headers.Cookie = `SWID=${SWID}; espn_s2=${S2}`

  try {
    const res = await fetch(url, { headers, redirect: 'manual' })
    if (res.status !== 200) return `${res.status}`
    const d = await res.json() as {
      draftDetail?: { picks?: { playerId: number }[]; drafted?: boolean; inProgress?: boolean }
      teams?: { roster?: { entries?: unknown[] } }[]
    }
    if (d.draftDetail?.picks) {
      const made = d.draftDetail.picks.filter((p) => p.playerId !== -1).length
      return `200 · ${made} picks · inProgress=${d.draftDetail.inProgress}`
    }
    if (d.teams) {
      const n = d.teams.reduce((a, t) => a + (t.roster?.entries?.length ?? 0), 0)
      return `200 · ${n} rostered`
    }
    return '200 · no useful shape'
  } catch (e) {
    return `error: ${(e as Error).message.slice(0, 40)}`
  }
}

async function main() {
  if (!SWID || !S2) {
    console.log('ESPN_SWID / ESPN_S2 are not set in .env.local — nothing to test yet.')
    return
  }
  console.log(`SWID ${SWID.slice(0, 8)}…  espn_s2 ${S2.length} chars\n`)

  for (const host of HOSTS) {
    for (const view of ['mDraftDetail', 'mRoster']) {
      const anon = await tryOne(host, view, false)
      const auth = await tryOne(host, view, true)
      console.log(`${host.replace('https://', '').padEnd(30)} ${view.padEnd(13)}`)
      console.log(`   anon: ${anon}`)
      console.log(`   auth: ${auth}`)
    }
  }
}
main()

export {}

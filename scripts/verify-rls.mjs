/**
 * Live RLS verification against the linked Supabase project.
 *
 * The site is public and ungated, so `anon` is every visitor on the internet.
 * This asserts what a visitor can and cannot do, using a canary value seeded
 * with the secret key and removed afterward.
 *
 * Empty tables make RLS tests meaningless — a filtered read and a permitted
 * read both return `200 []`. Everything here runs against seeded rows.
 *
 *   set -a; . ./.env.local; set +a && node scripts/verify-rls.mjs
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SECRET = process.env.SUPABASE_SECRET_KEY
if (!URL_ || !ANON || !SECRET) {
  console.error('Missing Supabase env. Run: set -a; . ./.env.local; set +a')
  process.exit(1)
}

const REST = `${URL_}/rest/v1`
const CANARY = 'CANARY-MUST-NOT-LEAK'
const h = (key, extra = {}) => ({
  apikey: key, Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json', ...extra,
})
const asAnon = (path) => fetch(`${REST}/${path}`, { headers: h(ANON) })
const asSecret = (path, init = {}) =>
  fetch(`${REST}/${path}`, { ...init, headers: h(SECRET, init.headers) })

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function seed() {
  const post = async (t, body) => {
    const r = await asSecret(t, {
      method: 'POST', body: JSON.stringify(body),
      headers: { Prefer: 'return=representation' },
    })
    if (!r.ok) throw new Error(`seed ${t}: ${r.status} ${await r.text()}`)
    return (await r.json())[0]
  }
  const league = await post('leagues', { espn_league_id: 999999, name: '__rls_probe__' })
  const season = await post('seasons', {
    league_id: league.id, year: 1999, regular_season_weeks: 13,
    final_scoring_period: 17, playoff_team_count: 6,
  })
  await post('transactions', {
    season_id: season.id, espn_transaction_id: '__rls_probe__',
    transaction_type: 'WAIVER', raw_payload: { secret: CANARY },
  })
  await post('sync_runs', { sync_type: '__rls_probe__', status: 'FAILED', error_message: CANARY })
  return { leagueId: league.id }
}

async function cleanup(leagueId) {
  // transactions/seasons cascade from leagues.
  await asSecret(`leagues?id=eq.${leagueId}`, { method: 'DELETE' })
  await asSecret(`sync_runs?sync_type=eq.__rls_probe__`, { method: 'DELETE' })
  await asSecret(`leagues?espn_league_id=eq.111111`, { method: 'DELETE' })
}

let seeded
try {
  seeded = await seed()

  console.log('\nAnon can read public league data:')
  check('SELECT leagues', (await asAnon('leagues?select=id')).ok)
  check('SELECT sync_status view', (await asAnon('sync_status?select=sync_type')).ok)

  console.log('\nAnon cannot write:')

  // Status codes lie here. PostgREST returns 204 for a DELETE that matched
  // zero rows, which is exactly what RLS produces — indistinguishable from a
  // successful delete by status alone. Assert on STATE, not on the response.
  const probeStillThere = async () => {
    const r = await asSecret('leagues?select=id&espn_league_id=eq.999999')
    return (await r.json()).length === 1
  }

  const ins = await fetch(`${REST}/leagues`, {
    method: 'POST', headers: h(ANON),
    body: JSON.stringify({ espn_league_id: 111111, name: '__anon_pwn__' }),
  })
  const insLanded = await asSecret('leagues?select=id&espn_league_id=eq.111111')
  check('INSERT leagues blocked', (await insLanded.json()).length === 0, `HTTP ${ins.status}`)

  const del = await fetch(`${REST}/leagues?espn_league_id=eq.999999`, {
    method: 'DELETE', headers: h(ANON),
  })
  check('DELETE leagues blocked', await probeStillThere(), `HTTP ${del.status} — row survived`)

  const upd = await fetch(`${REST}/leagues?espn_league_id=eq.999999`, {
    method: 'PATCH', headers: h(ANON), body: JSON.stringify({ name: '__anon_pwn__' }),
  })
  const after = await (await asSecret('leagues?select=name&espn_league_id=eq.999999')).json()
  check('UPDATE leagues blocked', after[0]?.name === '__rls_probe__', `HTTP ${upd.status}`)

  console.log('\nAnon cannot read sensitive fields:')
  for (const path of ['transactions?select=*', 'transactions?select=raw_payload',
                      'sync_runs?select=*', 'sync_status?select=*']) {
    const body = await (await asAnon(path)).text()
    check(`no canary via ${path}`, !body.includes(CANARY))
  }

  console.log('\nPermitted columns still readable:')
  const r = await asAnon('transactions?select=espn_transaction_id,transaction_type')
  check('SELECT transactions (named columns)', r.ok && (await r.text()).includes('__rls_probe__'))
} finally {
  if (seeded) await cleanup(seeded.leagueId)
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
console.log('✅ RLS verified')

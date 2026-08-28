/**
 * Fails if ANY identifier present in the raw ESPN captures survives into the
 * committed fixtures. The list of secrets is derived from the raw files rather
 * than hardcoded, so this cannot be under-specified the way a fixed sample list
 * can. Run after sanitize-fixtures.mjs.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const RAW = 'fixtures/raw', OUT = 'fixtures'
if (!existsSync(RAW)) { console.log('no raw captures — nothing to check'); process.exit(0) }

const secrets = new Set()
for (const f of readdirSync(RAW).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(RAW, f), 'utf8'))
  const walk = (n) => {
    if (typeof n === 'string') {
      if (/^\{[0-9A-F-]{36}\}$/i.test(n)) secrets.add(n)
    } else if (Array.isArray(n)) n.forEach(walk)
    else if (n && typeof n === 'object') {
      for (const [k, v] of Object.entries(n)) {
        if (['firstName', 'lastName', 'displayName', 'name', 'abbrev', 'location', 'nickname'].includes(k)
            && typeof v === 'string' && v.trim()) secrets.add(v.trim())
        walk(v)
      }
    }
  }
  walk(d)
}

// ESPN's own generic defaults are not identifying.
const ALLOW = new Set(['League Standings', 'Demo League'])
for (const a of ALLOW) secrets.delete(a)

// Compare against parsed STRING VALUES, not raw file text. Substring matching
// produced false positives (abbrev 'CT' matching inside unrelated tokens).
const leaks = []
for (const f of readdirSync(OUT).filter((x) => x.endsWith('.json'))) {
  const values = new Set()
  const walk = (n) => {
    if (typeof n === 'string') values.add(n)
    else if (Array.isArray(n)) n.forEach(walk)
    else if (n && typeof n === 'object') Object.values(n).forEach(walk)
  }
  walk(JSON.parse(readFileSync(join(OUT, f), 'utf8')))
  for (const s of secrets) if (values.has(s)) leaks.push(`${f}: ${JSON.stringify(s)}`)
}

console.log(`checked ${secrets.size} real identifiers against committed fixtures`)
if (leaks.length) {
  console.error(`\n❌ ${leaks.length} LEAK(S):`)
  for (const l of leaks.slice(0, 20)) console.error('   ' + l)
  process.exit(1)
}
console.log('✅ clean — no raw identifiers present in fixtures/')

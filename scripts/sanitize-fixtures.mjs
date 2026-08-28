/**
 * Regenerates committed fixtures in /fixtures from the gitignored raw ESPN
 * captures in /fixtures/raw.
 *
 * Raw captures contain real member GUIDs and real names. The repo is public, so
 * only sanitized fixtures are committed. Structure is preserved exactly — only
 * identifying values are swapped — so transform tests stay meaningful.
 *
 *   node scripts/sanitize-fixtures.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RAW = 'fixtures/raw'
const OUT = 'fixtures'

if (!existsSync(RAW)) {
  console.error(`Missing ${RAW}/ — re-capture from ESPN first. See AI-References/ESPN-API.md`)
  process.exit(1)
}

const FAKE_MANAGERS = [
  ['Avery', 'Brooks'], ['Casey', 'Delgado'], ['Devon', 'Ellis'], ['Emery', 'Fontaine'],
  ['Finley', 'Garza'], ['Harper', 'Iverson'], ['Quinn', 'Keeler'], ['Kai', 'Lindqvist'],
  ['Logan', 'Mercer'], ['Micah', 'Novak'], ['Reese', 'Okafor'], ['Sky', 'Pettersen'],
]

const guidMap = new Map()
function fakeGuid(real) {
  if (!guidMap.has(real)) {
    const n = guidMap.size
    const h = n.toString(16).padStart(2, '0').toUpperCase()
    guidMap.set(real, `{00000000-0000-4000-8000-0000000000${h}}`)
  }
  return guidMap.get(real)
}

const GUID_RE = /^\{[0-9A-F-]{36}\}$/i

/**
 * Recursively swap any value that looks like a member GUID.
 *
 * NOTE: strings are tested at the top of the function, NOT inside the object
 * branch. An earlier version only checked object values, which silently let
 * GUIDs inside arrays (teams[].owners[0]) through.
 */
function scrub(node) {
  if (typeof node === 'string') return GUID_RE.test(node) ? fakeGuid(node) : node
  if (Array.isArray(node)) return node.map(scrub)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = scrub(v)
    return out
  }
  return node
}

// Team names embed real first names ("Doug's Dangerous Team"). The repo is
// public, so committed fixtures get synthetic names. Live app display is a
// separate decision — see AI-References/MEMORY.md open questions.
const FAKE_TEAMS = [
  ['Avery Alliance', 'AVA'], ['Bayou Bandits', 'BYB'], ['Cobalt Crushers', 'COB'],
  ['Delta Dynamos', 'DLT'], ['Ember Eagles', 'EMB'], ['Frost Giants', 'FRG'],
  ['Granite Guard', 'GRG'], ['Harbor Hawks', 'HRB'], ['Iron Ibis', 'IRI'],
  ['Jade Jackals', 'JDJ'], ['Kestrel Kings', 'KSK'], ['Lumen Lions', 'LMN'],
]

let count = 0
for (const file of readdirSync(RAW).filter((f) => f.endsWith('.json'))) {
  const data = scrub(JSON.parse(readFileSync(join(RAW, file), 'utf8')))

  // Replace real people with stable synthetic managers.
  if (Array.isArray(data.members)) {
    data.members = data.members.map((m, i) => {
      const [first, last] = FAKE_MANAGERS[i % FAKE_MANAGERS.length]
      return { ...m, firstName: first, lastName: last, displayName: `${first.toLowerCase()}${last.toLowerCase()}` }
    })
  }
  // Strip notification settings — noisy, personal, irrelevant to transforms.
  if (Array.isArray(data.members)) {
    data.members = data.members.map(({ notificationSettings, ...rest }) => rest)
  }
  // Neutralize league name.
  if (data.settings?.name) data.settings.name = 'Demo League'
  // Replace real team names / abbreviations.
  if (Array.isArray(data.teams)) {
    data.teams = data.teams.map((t, i) => {
      const [name, abbrev] = FAKE_TEAMS[i % FAKE_TEAMS.length]
      return { ...t, name, abbrev, location: undefined, nickname: undefined }
    })
  }

  writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')
  count++
}
console.log(`Sanitized ${count} fixtures -> ${OUT}/  (${guidMap.size} GUIDs remapped)`)

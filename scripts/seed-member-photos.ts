/**
 * Links league member photos in /public/members to franchises.
 *
 * Editorial data (§13) — run when photos are added or renamed:
 *   set -a; . ./.env.local; set +a && npm run seed:photos
 *
 * Matches on a slug of the manager name. Reports anything it cannot match in
 * either direction rather than silently leaving a franchise without a photo,
 * because a near-miss spelling is exactly the kind of thing that looks fine
 * until someone notices one avatar is a fallback.
 */
import { readdirSync } from 'node:fs'
import { createServiceClient } from '../src/lib/supabase/server'

const PHOTO_DIR = 'public/members'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Levenshtein, for suggesting a near-miss on a failed match. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
  return d[a.length][b.length]
}

async function main() {
  const files = readdirSync(PHOTO_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
  const bySlug = new Map(files.map((f) => [slug(f.replace(/\.[^.]+$/, '')), f]))

  const db = createServiceClient()
  const { data: franchises, error } = await db
    .from('franchises')
    .select('id, manager_name')
    .order('id')
  if (error) throw error

  const unmatchedFranchises: string[] = []
  const usedFiles = new Set<string>()
  let linked = 0

  for (const f of franchises ?? []) {
    const key = slug(f.manager_name)
    const file = bySlug.get(key)

    if (!file) {
      // Offer the closest filename so a typo is obvious rather than mysterious.
      let best = '', bestD = Infinity
      for (const candidate of bySlug.keys()) {
        const d = distance(key, candidate)
        if (d < bestD) { bestD = d; best = candidate }
      }
      unmatchedFranchises.push(
        `${f.manager_name}  (looked for "${key}"${bestD <= 4 ? `, closest file is "${best}"` : ''})`,
      )
      continue
    }

    usedFiles.add(file)
    const { error: upErr } = await db
      .from('franchises')
      .update({ photo_url: `/members/${file}` })
      .eq('id', f.id)
    if (upErr) throw upErr
    linked++
    console.log(`  ✅ ${f.manager_name.padEnd(20)} -> /members/${file}`)
  }

  const orphanFiles = files.filter((f) => !usedFiles.has(f))

  console.log(`\n${linked}/${franchises?.length ?? 0} franchises linked`)
  if (unmatchedFranchises.length) {
    console.error('\n❌ franchises with no photo:')
    for (const u of unmatchedFranchises) console.error('   ' + u)
  }
  if (orphanFiles.length) {
    console.error('\n⚠️  photo files matched to nobody:')
    for (const o of orphanFiles) console.error('   ' + o)
  }
  if (unmatchedFranchises.length || orphanFiles.length) process.exit(1)
  console.log('✅ every franchise has a photo, every photo has a franchise')
}

void main()

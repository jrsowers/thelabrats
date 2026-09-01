import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APP_DIR = join(process.cwd(), 'src', 'app')

/**
 * Sample values for dynamic segments.
 *
 * A dynamic route with no entry here is a HARD FAILURE, not a skip — silently
 * dropping a route is exactly how a page escapes the responsive net and nobody
 * notices for three weeks.
 */
export const DYNAMIC_SAMPLES: Record<string, string> = {
  '[slug]': 'week-0-the-lab-opens',
  '[name]': 'jesse',
}

/** Routes deliberately excluded, each with a reason. */
const EXCLUDED = new Set<string>([
  '/style', // the living style guide renders every token at once by design
])

export interface DiscoveredRoute {
  route: string
  source: string
  /** Unresolved dynamic segments, if any — these fail the suite. */
  missing: string[]
}

/**
 * Walks src/app and returns every routable page.
 *
 * Filesystem-driven on purpose: adding a page adds coverage. There is no list
 * to update and therefore no list to forget.
 */
export function discoverRoutes(): DiscoveredRoute[] {
  const out: DiscoveredRoute[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry === 'page.tsx' || entry === 'page.ts') {
        const rel = relative(APP_DIR, dir)
        const segments = rel === '' ? [] : rel.split(sep)

        // A folder starting with `_` opts the whole subtree out of routing in
        // Next.js. Such a page is not a route — skipping the SEGMENT instead of
        // the PAGE would emit a phantom duplicate of its parent route.
        if (segments.some((s) => s.startsWith('_'))) continue

        const missing: string[] = []
        const resolved = segments
          // (group) folders are organisational: stripped, still routable.
          .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
          .map((s) => {
            if (!s.startsWith('[')) return s
            const sample = DYNAMIC_SAMPLES[s]
            if (!sample) missing.push(s)
            return sample ?? s
          })

        const route = '/' + resolved.join('/')
        const normalised = route === '/' ? '/' : route.replace(/\/$/, '')
        if (!EXCLUDED.has(normalised)) {
          out.push({ route: normalised, source: relative(process.cwd(), full), missing })
        }
      }
    }
  }

  walk(APP_DIR)
  return out.sort((a, b) => a.route.localeCompare(b.route))
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Recap content: one league-wide feature and a report card per team.
 *
 * Currently the sample generated from the hypothesised draft. After the real
 * draft the same file is regenerated and `sample` flips to false.
 */
export interface RecapFeature {
  headline: string
  standfirst: string
  body: string[]
}

export interface TeamRecap {
  manager: string
  slug: string
  teamName: string
  teamId: number
  /** Always "F". That is the joke. */
  grade: string
  verdict: string
  teaser: string
  body: string[]
}

export interface DraftRecap {
  sample: boolean
  generatedAt: string | null
  feature: RecapFeature | null
  teams: TeamRecap[]
}

const PATH = join(process.cwd(), 'fixtures', 'sample-draft-recap.json')

export function getDraftRecap(): DraftRecap {
  try {
    const raw = JSON.parse(readFileSync(PATH, 'utf8')) as Partial<DraftRecap>
    return {
      sample: raw.sample ?? true,
      generatedAt: raw.generatedAt ?? null,
      feature: raw.feature ?? null,
      teams: raw.teams ?? [],
    }
  } catch {
    return { sample: true, generatedAt: null, feature: null, teams: [] }
  }
}

export const teamRecapBySlug = (slug: string): TeamRecap | null =>
  getDraftRecap().teams.find((t) => t.slug === slug) ?? null

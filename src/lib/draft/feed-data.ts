import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Reads the draft feed for the pages.
 *
 * Today this is the sample feed generated from the hypothesised draft, so the
 * pages could be built and reviewed before Thursday. On draft day the live
 * runner writes the same shape and `sample` flips to false — the pages do not
 * change, they just stop saying SAMPLE.
 */
export interface FeedRoast { text: string; theme: string; fallback: boolean }

export interface FeedPick {
  overallPickNumber: number
  round: number
  roundPick: number
  teamId: number
  teamName: string
  /** First name — how the league refers to each other. */
  manager: string
  /** Full name, used to resolve the member photo. */
  managerFull: string
  managerPhoto: string | null
  /** ESPN id. Negative for a team defence, which has a logo not a headshot. */
  playerId: number
  player: string
  position: string
  proTeam: string | null
  leagueRank: number
  adp: number
  reachSlots: number
  betterAvailable: number
  roast: FeedRoast | null
}

export interface DraftFeed {
  sample: boolean
  generatedAt: string | null
  picks: FeedPick[]
  /** True once every pick has been made. */
  complete: boolean
  totalRounds: number
}

const SAMPLE_PATH = join(process.cwd(), 'fixtures', 'sample-draft-feed.json')

export function getDraftFeed(): DraftFeed {
  try {
    const raw = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as {
      sample?: boolean; generatedAt?: string; picks?: FeedPick[]
    }
    const picks = raw.picks ?? []
    const totalRounds = picks.reduce((m, p) => Math.max(m, p.round), 0)
    return {
      sample: raw.sample ?? true,
      generatedAt: raw.generatedAt ?? null,
      picks,
      complete: picks.length > 0,
      totalRounds,
    }
  } catch {
    // No feed yet is a normal pre-draft state, not an error.
    return { sample: true, generatedAt: null, picks: [], complete: false, totalRounds: 0 }
  }
}

/** Picks newest first — how a live feed reads. */
export const newestFirst = (picks: FeedPick[]): FeedPick[] =>
  [...picks].sort((a, b) => b.overallPickNumber - a.overallPickNumber)

/** Picks in draft order — how a finished draft reads. */
export const draftOrder = (picks: FeedPick[]): FeedPick[] =>
  [...picks].sort((a, b) => a.overallPickNumber - b.overallPickNumber)

/**
 * Ordering depends on what the page is for.
 *
 * Live, you want the newest pick at the top. Finished, you want to read it as a
 * story from 1.01 — newest-first opens a completed draft on round 15, which is
 * kickers, defences and no jokes at all.
 */
export const feedOrder = (picks: FeedPick[], complete: boolean): FeedPick[] =>
  complete ? draftOrder(picks) : newestFirst(picks)

/** Only the picks that got a comment. */
export const roasted = (picks: FeedPick[]): FeedPick[] =>
  picks.filter((p) => p.roast !== null)

export function picksByTeam(picks: FeedPick[]): Map<number, FeedPick[]> {
  const m = new Map<number, FeedPick[]>()
  for (const p of picks) {
    const list = m.get(p.teamId) ?? []
    list.push(p)
    m.set(p.teamId, list)
  }
  for (const list of m.values()) list.sort((a, b) => a.overallPickNumber - b.overallPickNumber)
  return m
}

/** URL slug for a manager: first name, lowercased. Collision-free for this league. */
export const slugFor = (manager: string): string =>
  manager.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Member photos live at /members/first-last.jpg. */
export const memberPhotoFor = (fullName: string): string | null => {
  const slug = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return slug ? `/members/${slug}.jpg` : null
}

/** ESPN gives every team defence a negative player id. */
export const isTeamDefense = (p: FeedPick): boolean =>
  p.position === 'DST' || p.playerId < 0

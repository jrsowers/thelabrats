import { createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server'

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

/** Whose turn it is, derived from the first slot with nobody in it. */
export interface OnTheClock {
  overallPickNumber: number
  round: number
  roundPick: number
  teamName: string
  manager: string
  managerPhoto: string | null
}

export interface DraftFeed {
  sample: boolean
  generatedAt: string | null
  picks: FeedPick[]
  /** True once every pick has been made. */
  complete: boolean
  totalRounds: number
  onTheClock: OnTheClock | null
}

const EMPTY: DraftFeed = {
  sample: false, generatedAt: null, picks: [],
  complete: false, totalRounds: 0, onTheClock: null,
}

const SEASON = Number(process.env.ESPN_SEASON ?? 2026)

type Row = {
  overall_pick: number; round: number; round_pick: number
  espn_team_id: number; team_name: string; manager: string
  manager_full: string | null; manager_photo: string | null
  espn_player_id: number | null; player_name: string | null
  position: string | null; pro_team: string | null
  league_rank: number | null; adp: number | string | null
  reach_slots: number | null; better_available: number | null
  roast_text: string | null; roast_theme: string | null; roast_fallback: boolean
  is_sample: boolean
}

/**
 * The feed, from Postgres.
 *
 * It used to be read from a fixture on disk, which worked locally and did
 * nothing at all in production: on Vercel that file is frozen into the build,
 * so picks written by the runner during the draft never reached a viewer.
 * Confirmed by editing the local file and watching production not move.
 *
 * Rows exist for every draft slot, including ones not yet used, so an unmade
 * pick is `player_name === null` rather than a missing row. That is what lets
 * the page name who is on the clock.
 */
export async function getDraftFeed(): Promise<DraftFeed> {
  if (!isSupabaseConfigured()) return EMPTY

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('draft_picks')
    .select('*')
    .eq('season', SEASON)
    .order('overall_pick', { ascending: true })

  if (error || !data || data.length === 0) return EMPTY

  const rows = data as unknown as Row[]
  const picks: FeedPick[] = rows
    .filter((r) => r.player_name !== null)
    .map((r) => ({
      overallPickNumber: r.overall_pick,
      round: r.round,
      roundPick: r.round_pick,
      teamId: r.espn_team_id,
      teamName: r.team_name,
      manager: r.manager,
      managerFull: r.manager_full ?? r.manager,
      managerPhoto: r.manager_photo,
      playerId: r.espn_player_id ?? 0,
      player: r.player_name as string,
      position: r.position ?? '',
      proTeam: r.pro_team,
      leagueRank: r.league_rank ?? 0,
      adp: typeof r.adp === 'string' ? Number(r.adp) : (r.adp ?? 9999),
      reachSlots: r.reach_slots ?? 0,
      betterAvailable: r.better_available ?? 0,
      roast: r.roast_text
        ? { text: r.roast_text, theme: r.roast_theme ?? '', fallback: r.roast_fallback }
        : null,
    }))

  // The first slot nobody has used yet. Null once every pick is in.
  const next = rows.find((r) => r.player_name === null)

  return {
    sample: rows.some((r) => r.is_sample),
    generatedAt: null,
    picks,
    complete: next === undefined,
    totalRounds: rows.reduce((m, r) => Math.max(m, r.round), 0),
    onTheClock: next
      ? {
          overallPickNumber: next.overall_pick,
          round: next.round,
          roundPick: next.round_pick,
          teamName: next.team_name,
          manager: next.manager,
          managerPhoto: next.manager_photo,
        }
      : null,
  }
}

/** Picks newest first — how a live feed reads. */
export const newestFirst = (picks: FeedPick[]): FeedPick[] =>
  [...picks].sort((a, b) => b.overallPickNumber - a.overallPickNumber)

/** Picks in draft order — how a finished draft reads. */
export const draftOrder = (picks: FeedPick[]): FeedPick[] =>
  [...picks].sort((a, b) => a.overallPickNumber - b.overallPickNumber)

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

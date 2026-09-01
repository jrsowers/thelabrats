import type { DraftablePlayer } from './types'

/**
 * Builds the league's OWN draft board.
 *
 * ESPN publishes a generic SUPERFLEX rank, but it assumes ESPN's defaults. This
 * league uses 6-point passing touchdowns and half-PPR, which the generic board
 * does not price — it materially undervalues quarterbacks here. Verified by
 * hand against ESPN's own projections: Josh Allen's appliedTotal only
 * reconciles with 6-point passing TDs.
 *
 * Ranking by raw projected points is also wrong, because quarterbacks always
 * score most. The board ranks by VALUE OVER REPLACEMENT: how many points a
 * player is worth above the last startable player at his position. That is what
 * makes a 300-point QB and a 220-point RB comparable.
 */

export interface ProjectedPlayer {
  id: number
  name: string
  pos: DraftablePlayer['pos']
  proTeam: string | null
  /** Season projection, scored with THIS league's rules. */
  projectedPoints: number
  adp: number
  injuryStatus: string | null
}

export interface BoardOptions {
  teams: number
  /** Starting slots per team, e.g. { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }. */
  starters: Record<string, number>
  /** Superflex/OP slots — filled by a QB in practice. */
  superflexSlots: number
  /** FLEX slots, shared between RB/WR/TE. */
  flexSlots: number
}

export interface RankedPlayer extends ProjectedPlayer {
  /** Points above the last startable player at this position. */
  vor: number
  /** 1-based rank on THIS league's board. */
  leagueRank: number
  replacementPoints: number
}

/**
 * How many of each position get started league-wide. This sets replacement
 * level, which is the whole game: in superflex roughly two QBs start per team,
 * so the 24th QB is the bar rather than the 12th.
 */
export function replacementCounts({
  teams, starters, superflexSlots, flexSlots,
}: BoardOptions): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [pos, n] of Object.entries(starters)) counts[pos] = n * teams

  // The OP slot is a quarterback in all but pathological cases.
  counts.QB = (counts.QB ?? 0) + superflexSlots * teams

  // FLEX is shared. Split it the way leagues actually fill it: mostly RB/WR.
  const flex = flexSlots * teams
  counts.RB = (counts.RB ?? 0) + Math.round(flex * 0.5)
  counts.WR = (counts.WR ?? 0) + Math.round(flex * 0.4)
  counts.TE = (counts.TE ?? 0) + Math.round(flex * 0.1)

  return counts
}

export function buildBoard(
  players: ProjectedPlayer[], opts: BoardOptions,
): RankedPlayer[] {
  const counts = replacementCounts(opts)

  const byPos = new Map<string, ProjectedPlayer[]>()
  for (const p of players) {
    const list = byPos.get(p.pos) ?? []
    list.push(p)
    byPos.set(p.pos, list)
  }

  const replacement: Record<string, number> = {}
  for (const [pos, list] of byPos) {
    list.sort((a, b) => b.projectedPoints - a.projectedPoints)
    const n = counts[pos] ?? list.length
    // The first player who does NOT start is the bar. Fall back to the last
    // ranked player when a position is thinner than the league starts.
    replacement[pos] = list[Math.min(n, list.length - 1)]?.projectedPoints ?? 0
  }

  const scored = players.map((p) => ({
    ...p,
    replacementPoints: replacement[p.pos] ?? 0,
    vor: p.projectedPoints - (replacement[p.pos] ?? 0),
    leagueRank: 0,
  }))

  // Kickers and defences rank BENEATH every skill player, whatever VOR says.
  //
  // Raw VOR puts the best defence around pick 57 and the best kicker around 69,
  // because a kicker genuinely projects ~165 points. That is arithmetically
  // true and completely wrong as a draft board: those projections are close to
  // random year over year, which is why every mainstream board buries them and
  // why taking one early is a running joke. Ranking them inline would have the
  // bot treating a round-5 defence as sound.
  const LATE = new Set(['K', 'DST'])
  const skill = scored.filter((p) => !LATE.has(p.pos)).sort((a, b) => b.vor - a.vor)
  const late = scored.filter((p) => LATE.has(p.pos)).sort((a, b) => b.vor - a.vor)

  return [...skill, ...late].map((p, i) => ({ ...p, leagueRank: i + 1 }))
}

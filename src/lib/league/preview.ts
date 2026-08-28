/**
 * Simulated live scoring, for seeing what a Sunday actually looks like when no
 * games are running (PRODUCT_SPEC §16).
 *
 * Two rules make this safe:
 *  1. It NEVER touches the database. It decorates rows on their way to the view,
 *     so no simulated number can be mistaken for, or overwrite, a real one.
 *  2. It is deterministic — seeded from matchup id and week — so the page does
 *     not reshuffle on every render and a screenshot is reproducible.
 *
 * Every screen using it must show the preview banner. Simulated data that looks
 * real is worse than no data at all.
 */
import type { MatchupRow } from './queries'

/** mulberry32 — small, fast, good enough for plausible-looking scores. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * A believable mid-Sunday: a couple of early games final, most in progress,
 * one waiting on Monday night. Chosen to exercise every visual state at once.
 */
function statusFor(index: number, total: number): MatchupRow['status'] {
  if (index < Math.min(2, total)) return 'FINAL'
  if (index === total - 1) return 'SCHEDULED'
  return 'LIVE'
}

export function applyLivePreview(matchups: MatchupRow[], week: number): MatchupRow[] {
  return matchups.map((m, i) => {
    const status = statusFor(i, matchups.length)
    const r = rng(m.id * 7919 + week * 104729)

    const side = (record: string) => {
      const projected = round1(between(r, 96, 141))
      if (status === 'SCHEDULED') return { score: 0, projected, record }
      if (status === 'LIVE') {
        // Partway through the slate: a fraction of the projection is banked.
        const pace = between(r, 0.34, 0.78)
        return { score: round1(projected * pace), projected, record }
      }
      // Final games drift from their projection in both directions.
      return { score: round1(projected * between(r, 0.72, 1.28)), projected: null, record }
    }

    // Records reflect the weeks already played, so week 1 stays 0-0.
    const played = Math.max(0, week - 1)
    const wins = played === 0 ? 0 : Math.round(between(r, 0, played))
    const awayRec = `${wins}-${played - wins}-0`
    const homeRec = `${played - wins}-${wins}-0`

    const away = m.away ? { ...m.away, ...side(awayRec) } : null
    const home = m.home ? { ...m.home, ...side(homeRec) } : null

    return { ...m, status, away, home }
  })
}

/**
 * Simulated season results, so the standings table can be seen populated before
 * a game exists. Same rules as the scoreboard preview: never written, and
 * deterministic so ranks do not shuffle between renders.
 */
export function simulateSeason(
  matchups: { week: number; homeTeamId: number | null; awayTeamId: number | null; status: string }[],
  throughWeek: number,
) {
  return matchups.map((m) => {
    if (m.week > throughWeek) {
      return { ...m, homeScore: 0, awayScore: 0, status: 'SCHEDULED' }
    }
    const r = rng((m.homeTeamId ?? 0) * 31 + (m.awayTeamId ?? 0) * 17 + m.week * 1013)
    return {
      ...m,
      homeScore: round1(between(r, 74, 158)),
      awayScore: round1(between(r, 74, 158)),
      status: 'FINAL',
    }
  })
}

/* ============================================================
   Transaction preview
   ============================================================ */

export type TxnKind = 'WAIVER' | 'FREE_AGENT' | 'DROP' | 'TRADE'

export interface PreviewTxnItem {
  playerName: string
  position: string
  nflTeam: string
  action: 'ADD' | 'DROP' | 'TRADE'
  fromTeamId: number | null
  toTeamId: number | null
}

export interface PreviewTxn {
  id: string
  kind: TxnKind
  processedAt: string
  week: number
  teamId: number
  counterpartyTeamId: number | null
  waiverPriority: number | null
  items: PreviewTxnItem[]
}

const PLAYER_POOL: [string, string, string][] = [
  ['Jaylen Wright', 'RB', 'MIA'], ['Rome Odunze', 'WR', 'CHI'],
  ['Ladd McConkey', 'WR', 'LAC'], ['Bucky Irving', 'RB', 'TB'],
  ['Brian Thomas Jr.', 'WR', 'JAX'], ['Trey Benson', 'RB', 'ARI'],
  ['Ricky Pearsall', 'WR', 'SF'], ['Ben Sinnott', 'TE', 'WSH'],
  ['Jonathon Brooks', 'RB', 'CAR'], ['Xavier Legette', 'WR', 'CAR'],
  ['Blake Corum', 'RB', 'LAR'], ['Keon Coleman', 'WR', 'BUF'],
  ['Ja’Tavion Sanders', 'TE', 'CAR'], ['MarShawn Lloyd', 'RB', 'GB'],
  ['Malachi Corley', 'WR', 'NYJ'], ['Tyrone Tracy Jr.', 'RB', 'NYG'],
  ['Jermaine Burton', 'WR', 'CIN'], ['Cade Otton', 'TE', 'TB'],
  ['Audric Estime', 'RB', 'DEN'], ['Jalen McMillan', 'WR', 'TB'],
]

/**
 * Simulated transaction history, so the log can be seen populated and filtered
 * before the league has made a single move. Same rules as every other preview:
 * never written, and deterministic so the list does not reshuffle per render.
 */
export function simulateTransactions(teamIds: number[], throughWeek: number): PreviewTxn[] {
  const out: PreviewTxn[] = []
  if (teamIds.length === 0) return out

  // Fixed base date so the grouping headers are stable across renders.
  const BASE = Date.UTC(2026, 8, 9, 14, 0, 0) // Sept 9 2026, a Wednesday
  const DAY = 86_400_000

  let counter = 0
  for (let week = 1; week <= throughWeek; week++) {
    const r = rng(week * 7717)
    const moves = 2 + Math.floor(r() * 4) // 2-5 moves a week

    for (let i = 0; i < moves; i++) {
      counter++
      const team = teamIds[Math.floor(r() * teamIds.length)]
      const roll = r()
      const at = new Date(BASE + (week - 1) * 7 * DAY + Math.floor(r() * 5) * DAY + Math.floor(r() * 10) * 3_600_000)
      const pick = (n: number) => PLAYER_POOL[Math.floor(r() * PLAYER_POOL.length + n) % PLAYER_POOL.length]

      if (roll < 0.18) {
        // Trade: two teams, two or three players.
        let other = teamIds[Math.floor(r() * teamIds.length)]
        if (other === team) other = teamIds[(teamIds.indexOf(team) + 1) % teamIds.length]
        const [aName, aPos, aTeam] = pick(0)
        const [bName, bPos, bTeam] = pick(3)
        out.push({
          id: `p-${counter}`, kind: 'TRADE', processedAt: at.toISOString(), week,
          teamId: team, counterpartyTeamId: other, waiverPriority: null,
          items: [
            { playerName: aName, position: aPos, nflTeam: aTeam, action: 'TRADE', fromTeamId: team, toTeamId: other },
            { playerName: bName, position: bPos, nflTeam: bTeam, action: 'TRADE', fromTeamId: other, toTeamId: team },
          ],
        })
      } else if (roll < 0.55) {
        // Waiver claim, usually paired with a corresponding drop.
        const [aName, aPos, aTeam] = pick(0)
        const [bName, bPos, bTeam] = pick(5)
        out.push({
          id: `p-${counter}`, kind: 'WAIVER', processedAt: at.toISOString(), week,
          teamId: team, counterpartyTeamId: null,
          waiverPriority: 1 + Math.floor(r() * teamIds.length),
          items: [
            { playerName: aName, position: aPos, nflTeam: aTeam, action: 'ADD', fromTeamId: null, toTeamId: team },
            { playerName: bName, position: bPos, nflTeam: bTeam, action: 'DROP', fromTeamId: team, toTeamId: null },
          ],
        })
      } else if (roll < 0.82) {
        const [aName, aPos, aTeam] = pick(0)
        out.push({
          id: `p-${counter}`, kind: 'FREE_AGENT', processedAt: at.toISOString(), week,
          teamId: team, counterpartyTeamId: null, waiverPriority: null,
          items: [{ playerName: aName, position: aPos, nflTeam: aTeam, action: 'ADD', fromTeamId: null, toTeamId: team }],
        })
      } else {
        const [aName, aPos, aTeam] = pick(2)
        out.push({
          id: `p-${counter}`, kind: 'DROP', processedAt: at.toISOString(), week,
          teamId: team, counterpartyTeamId: null, waiverPriority: null,
          items: [{ playerName: aName, position: aPos, nflTeam: aTeam, action: 'DROP', fromTeamId: team, toTeamId: null }],
        })
      }
    }
  }

  return out.sort((a, b) => b.processedAt.localeCompare(a.processedAt))
}

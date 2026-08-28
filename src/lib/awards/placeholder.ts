/**
 * Placeholder award data.
 *
 * Thirteen of the twenty awards cannot be computed until player-level scoring
 * exists. This fills those cards with plausible values so the layout can be
 * judged before week 1.
 *
 * Three rules keep it honest:
 *  1. It NEVER writes anything. Cards are decorated on the way to the view.
 *  2. It is deterministic — seeded by award key and week — so the page does not
 *     reshuffle between renders and a screenshot is reproducible.
 *  3. Every card it produces is flagged `placeholder: true`, and the page marks
 *     them. Simulated data that passes for real is worse than no data (§22.8).
 *
 * Player names are drawn from the real synced player pool, so the cards show
 * what an actual week will look like rather than "Player A".
 */
import type { AwardDef } from './catalog'
import { buildCommentary, firstName, type Segment } from './commentary'

export interface AwardCard {
  def: AwardDef
  /** Team the award attaches to. */
  teamId: number | null
  /** Second team, for matchup-level awards. */
  opponentId: number | null
  /** Player name, for player awards. */
  playerName: string | null
  espnPlayerId: number | null
  playerMeta: string | null
  metricValue: string
  /** Bolded sentence naming the manager, the player or opponent, and the number. */
  commentary: Segment[]
  supporting: { label: string; value: string }[]
  placeholder: boolean
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const between = (r: () => number, lo: number, hi: number) => lo + r() * (hi - lo)
const f1 = (n: number) => n.toFixed(1)

export interface PlaceholderPools {
  /** Real teams, so sample commentary uses real names. */
  teams: { seasonTeamId: number; name: string; manager: string | null }[]
  /** From the real synced player pool, ids included so headshots resolve. */
  players: { espnPlayerId: number; name: string; position: string; nflTeam: string }[]
}

export function placeholderAward(
  def: AwardDef, week: number, pools: PlaceholderPools,
): AwardCard {
  const r = rng(hash(def.key) + week * 7919)
  const teams = pools.teams
  const winner = teams[Math.floor(r() * teams.length)] ?? null
  let foe = teams[Math.floor(r() * teams.length)] ?? null
  if (foe && winner && foe.seasonTeamId === winner.seasonTeamId) {
    const i = teams.findIndex((x) => x.seasonTeamId === winner.seasonTeamId)
    foe = teams[(i + 1) % teams.length] ?? null
  }
  const teamId = winner?.seasonTeamId ?? null
  const opponentId = foe?.seasonTeamId ?? null

  const player = pools.players.length > 0
    ? pools.players[Math.floor(r() * pools.players.length)]
    : null

  // Each award gets a value in a range that is plausible FOR THAT AWARD —
  // a bench MVP and a win-probability collapse are not the same kind of number.
  // Each award supplies its own plausible number and supporting stats; the
  // sentence itself comes from the shared commentary builder.
  const spec: Record<string, () => {
    value: string
    supporting: { label: string; value: string }[]
  }> = {
    waiver_wire_wizard: () => {
      const pts = between(r, 41, 78)
      return {
        value: f1(pts),
        supporting: [{ label: 'Added', value: `Week ${Math.max(1, week - 3)}` }],
      }
    },
    nostradamus: () => {
      const proj = between(r, 3.5, 7.8)
      const act = proj + between(r, 12, 24)
      return {
        value: `+${f1(act - proj)}`,
        supporting: [{ label: 'Projected', value: f1(proj) }, { label: 'Actual', value: f1(act) }],
      }
    },
    bench_bum: () => {
      const left = between(r, 26, 44)
      return {
        value: f1(left),
        supporting: [{ label: 'Efficiency', value: `${between(r, 68, 79).toFixed(0)}%` }],
      }
    },
    galaxy_brain: () => {
      const moves = Math.round(between(r, 5, 11))
      return {
        value: String(moves),
        supporting: [{ label: 'Result', value: 'Loss' }],
      }
    },
    choke_artist: () => {
      const edge = between(r, 18, 34)
      return {
        value: `+${f1(edge)}`,
        supporting: [{ label: 'Result', value: 'Loss' }],
      }
    },
    // Studs are manager awards; headlines name the player or matchup that
    // earned it. They must not repeat the card's description, which sits
    // directly above them.
    mastermind: () => {
      const left = between(r, 0.4, 3.8)
      return {
        value: f1(left),
        supporting: [{ label: 'Efficiency', value: `${between(r, 96, 99.6).toFixed(1)}%` }],
      }
    },
    prime_specimen: () => {
      const pts = between(r, 31, 46)
      return {
        value: f1(pts),
        supporting: [{ label: 'Slot', value: 'FLEX' }],
      }
    },
    giant_killer: () => {
      const deficit = between(r, 18, 34)
      return {
        value: `-${f1(deficit)}`,
        supporting: [{ label: 'Result', value: 'Win' }],
      }
    },
    cat_burglar: () => {
      const pts = between(r, 78, 94)
      return {
        value: f1(pts),
        supporting: [{ label: 'Opponent', value: f1(pts - between(r, 1, 6)) }],
      }
    },
    bad_beat: () => {
      const pts = between(r, 138, 158)
      return {
        value: f1(pts),
        supporting: [{ label: 'Margin', value: `-${f1(between(r, 0.5, 5))}` }],
      }
    },
    public_execution: () => {
      const margin = between(r, 62, 88)
      return {
        value: f1(margin),
        supporting: [{ label: 'Final', value: `${f1(between(r, 150, 172))}` }],
      }
    },
    dumpster_fire: () => {
      const total = between(r, 118, 142)
      return {
        value: f1(total),
        supporting: [{ label: 'Final', value: `${f1(total / 2 + 3)}` }],
      }
    },
  }

  const built = spec[def.key]?.() ?? {
    value: f1(between(r, 80, 150)),
    // Never fall back to def.blurb — it is rendered directly above this line.
    supporting: [],
  }

  return {
    def,
    teamId,
    opponentId: def.evidence === 'MATCHUP' ? opponentId : null,
    // A player is attached whenever the award is EVIDENCED by one, regardless
    // of who receives it — Studs are won by managers but earned by players.
    playerName: def.evidence === 'PLAYER' ? player?.name ?? null : null,
    espnPlayerId: def.evidence === 'PLAYER' ? player?.espnPlayerId ?? null : null,
    playerMeta: def.evidence === 'PLAYER' && player
      ? `${player.position} · ${player.nflTeam}` : null,
    metricValue: built.value,
    commentary: buildCommentary(def.key, {
      managerFirst: firstName(winner?.manager),
      teamName: winner?.name ?? 'TBD',
      opponentTeam: foe?.name ?? null,
      opponentManager: foe?.manager ?? null,
      playerName: def.evidence === 'PLAYER' ? player?.name ?? null : null,
      playerMeta: def.evidence === 'PLAYER' && player
        ? `${player.position} - ${player.nflTeam}` : null,
      value: built.value,
    }),
    supporting: built.supporting,
    placeholder: true,
  }
}

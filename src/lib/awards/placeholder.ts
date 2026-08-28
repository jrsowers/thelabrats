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
  headline: string
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
  teamIds: number[]
  /** From the real synced player pool, ids included so headshots resolve. */
  players: { espnPlayerId: number; name: string; position: string; nflTeam: string }[]
}

export function placeholderAward(
  def: AwardDef, week: number, pools: PlaceholderPools,
): AwardCard {
  const r = rng(hash(def.key) + week * 7919)
  const teamId = pools.teamIds[Math.floor(r() * pools.teamIds.length)] ?? null
  let opponentId = pools.teamIds[Math.floor(r() * pools.teamIds.length)] ?? null
  if (opponentId === teamId) {
    const i = pools.teamIds.indexOf(teamId!)
    opponentId = pools.teamIds[(i + 1) % pools.teamIds.length] ?? null
  }

  const player = pools.players.length > 0
    ? pools.players[Math.floor(r() * pools.players.length)]
    : null

  // Each award gets a value in a range that is plausible FOR THAT AWARD —
  // a bench MVP and a win-probability collapse are not the same kind of number.
  const spec: Record<string, () => { value: string; headline: string; supporting: { label: string; value: string }[] }> = {
    waiver_wire_wizard: () => {
      const pts = between(r, 41, 78)
      return {
        value: f1(pts),
        headline: `Picked up three weeks ago and has scored ${f1(pts)} since.`,
        supporting: [{ label: 'Added', value: `Week ${Math.max(1, week - 3)}` }],
      }
    },
    nostradamus: () => {
      const proj = between(r, 3.5, 7.8)
      const act = proj + between(r, 12, 24)
      return {
        value: `+${f1(act - proj)}`,
        headline: `Projected for ${f1(proj)}. Scored ${f1(act)}. Started anyway.`,
        supporting: [{ label: 'Projected', value: f1(proj) }, { label: 'Actual', value: f1(act) }],
      }
    },
    bench_boss: () => {
      const left = between(r, 26, 44)
      return {
        value: f1(left),
        headline: `The optimal lineup would have scored ${f1(left)} more.`,
        supporting: [{ label: 'Efficiency', value: `${between(r, 68, 79).toFixed(0)}%` }],
      }
    },
    start_sit_crime: () => {
      const cost = between(r, 14, 27)
      const margin = between(r, 1.5, cost - 2)
      return {
        value: f1(cost),
        headline: `Benched a ${f1(cost + between(r, 6, 12))}-point player and lost by ${f1(margin)}.`,
        supporting: [{ label: 'Final margin', value: `-${f1(margin)}` }],
      }
    },
    too_cute: () => {
      const cost = between(r, 9, 19)
      return {
        value: f1(cost),
        headline: `Chased a matchup and left ${f1(cost)} points on the table for it.`,
        supporting: [{ label: 'Result', value: 'Loss' }],
      }
    },
    choke_job: () => {
      const peak = between(r, 88, 97)
      return {
        value: `${peak.toFixed(0)}%`,
        headline: `Peaked at a ${peak.toFixed(0)}% win probability. Lost.`,
        supporting: [{ label: 'Final margin', value: `-${f1(between(r, 0.8, 6))}` }],
      }
    },
    dud_of_the_week: () => {
      const proj = between(r, 14, 21)
      const act = between(r, 0.4, 3.2)
      return {
        value: `-${f1(proj - act)}`,
        headline: `Projected for ${f1(proj)}. Managed ${f1(act)}.`,
        supporting: [{ label: 'Projected', value: f1(proj) }, { label: 'Actual', value: f1(act) }],
      }
    },
    // Studs are manager awards; headlines name the player or matchup that
    // earned it. They must not repeat the card's description, which sits
    // directly above them.
    manager_of_the_week: () => {
      const left = between(r, 0.4, 3.8)
      return {
        value: f1(left),
        headline: `Left just ${f1(left)} points on the bench — the tightest lineup in the league.`,
        supporting: [{ label: 'Efficiency', value: `${between(r, 96, 99.6).toFixed(1)}%` }],
      }
    },
    prime_specimen: () => {
      const pts = between(r, 31, 46)
      return {
        value: f1(pts),
        headline: `Started him. He went for ${f1(pts)}.`,
        supporting: [{ label: 'Slot', value: 'FLEX' }],
      }
    },
    bench_bum: () => {
      const pts = between(r, 22, 34)
      return {
        value: f1(pts),
        headline: `Scored ${f1(pts)} without ever leaving the bench.`,
        supporting: [{ label: 'Slot', value: 'BE' }],
      }
    },
    highway_robbery: () => {
      const pts = between(r, 78, 94)
      return {
        value: f1(pts),
        headline: `Won with ${f1(pts)}. Six teams scored more and lost.`,
        supporting: [{ label: 'Opponent', value: f1(pts - between(r, 1, 6)) }],
      }
    },
    bad_beat: () => {
      const pts = between(r, 138, 158)
      return {
        value: f1(pts),
        headline: `Scored ${f1(pts)} and lost. Would have beaten every other team.`,
        supporting: [{ label: 'Margin', value: `-${f1(between(r, 0.5, 5))}` }],
      }
    },
    public_execution: () => {
      const margin = between(r, 62, 88)
      return {
        value: f1(margin),
        headline: `A ${f1(margin)}-point margin. This was not a contest.`,
        supporting: [{ label: 'Final', value: `${f1(between(r, 150, 172))}` }],
      }
    },
    dumpster_fire: () => {
      const total = between(r, 118, 142)
      return {
        value: f1(total),
        headline: `${f1(total)} combined. Somebody had to win it.`,
        supporting: [{ label: 'Final', value: `${f1(total / 2 + 3)}` }],
      }
    },
    heartbreak_kid: () => {
      const swing = between(r, 8, 21)
      return {
        value: f1(swing),
        headline: `Outscored the final margin by ${f1(swing)} — on the other team.`,
        supporting: [{ label: 'Final margin', value: `-${f1(between(r, 1, 5))}` }],
      }
    },
  }

  const built = spec[def.key]?.() ?? {
    value: f1(between(r, 80, 150)),
    // Never fall back to def.blurb — it is rendered directly above this line.
    headline: 'Sample figures until week 1 scoring lands.',
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
    headline: built.headline,
    supporting: built.supporting,
    placeholder: true,
  }
}

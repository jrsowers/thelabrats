import type { PickAnalysis } from './types'
import { eligibleThemes, type RoastTheme } from './themes'

/**
 * Decides WHICH picks get roasted, and with WHICH theme.
 *
 * Constraints, all from James:
 *  - ~4 per round, flexing 2-6 so a dead round is not forced to produce four
 *  - 60 total across the draft (one every three picks)
 *  - every manager roasted at least 3 times, never more than 8
 *  - themes rotate; the same one never lands twice in a row
 *
 * Notability decides WHO within a round, not how many.
 */

export interface ScheduledRoast {
  pick: PickAnalysis
  theme: RoastTheme
  /** Alternatives, if the writer wants a different angle. */
  alternates: RoastTheme[]
}

export interface ScheduleOptions {
  totalTarget?: number
  perRoundTarget?: number
  perRoundMin?: number
  perRoundMax?: number
  perManagerMin?: number
  perManagerMax?: number
  dossierNames?: Set<string>
  totalRounds?: number
  /**
   * Ceiling on any single theme, as a share of the total. Without it
   * BACKHANDED_COMPLIMENT takes a fifth of the draft — it is eligible on every
   * best-available pick — and a bot that compliments you every fifth pick has
   * no teeth left when it matters.
   */
  maxThemeShare?: number
}

export function scheduleRoasts(
  all: PickAnalysis[],
  {
    totalTarget = 60,
    perRoundTarget = 4,
    perRoundMin = 2,
    perRoundMax = 6,
    perManagerMin = 3,
    perManagerMax = 8,
    dossierNames,
    totalRounds = 15,
    maxThemeShare = 0.15,
  }: ScheduleOptions = {},
): ScheduledRoast[] {
  if (all.length === 0) return []

  const rounds = [...new Set(all.map((p) => p.round))].sort((a, b) => a - b)
  const perManager = new Map<number, number>()
  const perRound = new Map<number, number>()
  const chosen = new Map<number, PickAnalysis>() // overallPickNumber -> pick

  const managerCount = (id: number) => perManager.get(id) ?? 0
  const roundCount = (r: number) => perRound.get(r) ?? 0
  const take = (p: PickAnalysis) => {
    chosen.set(p.overallPickNumber, p)
    perManager.set(p.team.teamId, managerCount(p.team.teamId) + 1)
    perRound.set(p.round, roundCount(p.round) + 1)
  }
  const drop = (p: PickAnalysis) => {
    chosen.delete(p.overallPickNumber)
    perManager.set(p.team.teamId, managerCount(p.team.teamId) - 1)
    perRound.set(p.round, roundCount(p.round) - 1)
  }

  // --- Pass 1: fill each round by notability, respecting the manager ceiling.
  for (const round of rounds) {
    const inRound = all
      .filter((p) => p.round === round)
      .sort((a, b) => b.notability - a.notability)

    // Rounds with more to say get more; dead rounds get fewer.
    const meaty = inRound.filter((p) => p.notability >= 35).length
    const target = clamp(
      meaty >= perRoundTarget ? perRoundTarget + 1 : meaty <= 1 ? perRoundMin : perRoundTarget,
      perRoundMin, perRoundMax,
    )

    let taken = 0
    for (const p of inRound) {
      if (taken >= target) break
      if (managerCount(p.team.teamId) >= perManagerMax) continue
      take(p); taken++
    }
  }

  // --- Pass 2: nobody escapes the draft under the floor.
  for (const teamId of new Set(all.map((p) => p.team.teamId))) {
    while (managerCount(teamId) < perManagerMin) {
      const next = all
        .filter((p) => p.team.teamId === teamId
          && !chosen.has(p.overallPickNumber)
          && roundCount(p.round) < perRoundMax)
        .sort((a, b) => b.notability - a.notability)[0]
      if (!next) break
      take(next)
    }
  }

  // --- Pass 3: top up to the total with the best of what is left.
  if (chosen.size < totalTarget) {
    const rest = all
      .filter((p) => !chosen.has(p.overallPickNumber))
      .sort((a, b) => b.notability - a.notability)
    for (const p of rest) {
      if (chosen.size >= totalTarget) break
      if (managerCount(p.team.teamId) >= perManagerMax) continue
      if (roundCount(p.round) >= perRoundMax) continue
      take(p)
    }
  }

  // --- Pass 4: trim if we overshot, cutting the least interesting first and
  //     never dropping anyone below the floor.
  if (chosen.size > totalTarget) {
    const ordered = [...chosen.values()].sort((a, b) => a.notability - b.notability)
    for (const p of ordered) {
      if (chosen.size <= totalTarget) break
      if (managerCount(p.team.teamId) <= perManagerMin) continue
      if (roundCount(p.round) <= perRoundMin) continue
      drop(p)
    }
  }

  // --- Assign themes in draft order, avoiding immediate repeats.
  const ordered = [...chosen.values()].sort((a, b) => a.overallPickNumber - b.overallPickNumber)
  const recent: RoastTheme[] = []
  const used = new Map<RoastTheme, number>()
  const themeCap = Math.max(2, Math.ceil(ordered.length * maxThemeShare))

  return ordered.map((pick) => {
    const options = eligibleThemes({ pick, dossierNames, totalRounds })
    // Prefer a theme not used in the last three, then the least-used overall.
    const previous = recent[recent.length - 1]
    // Back-to-back repeats read as a broken bot, so they are excluded outright.
    const allowed = options.filter((t) => t !== previous)
    const base = allowed.length > 0 ? allowed : options
    // Drop anything already at its ceiling, unless that leaves nothing.
    const underCap = base.filter((t) => (used.get(t) ?? 0) < themeCap)
    const capped = underCap.length > 0 ? underCap : base

    const fresh = capped.filter((t) => !recent.slice(-3).includes(t))
    const pool = fresh.length > 0 ? fresh : capped
    const theme = [...pool].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0]

    recent.push(theme)
    used.set(theme, (used.get(theme) ?? 0) + 1)
    return { pick, theme, alternates: options.filter((t) => t !== theme) }
  })
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

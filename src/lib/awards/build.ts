/**
 * Assembles the cards a week's award page renders.
 *
 * Takes awards that have ALREADY been decided — read from the `awards` table,
 * written once per week by generate.ts — and fills anything missing with a
 * clearly-flagged placeholder. It does not compute, so the page cannot change
 * its mind about who won something between two page loads.
 *
 * Award types with no stored row fall back to a placeholder, which covers both
 * an award whose data does not exist yet and a week nobody has published.
 */
import { AWARDS, type AwardDef } from './catalog'
import { placeholderAward, type AwardCard, type PlaceholderPools } from './placeholder'
import { buildCommentary, firstName } from './commentary'

/** The decided-award shape, whether it came from the engine or the database. */
export interface DecidedAward {
  key: string
  teamId: number
  opponentId: number | null
  metricValue: string
  metricTone?: 'live' | 'loss'
  headline: string
  supporting: { label: string; value: string }[]
  player?: { espnPlayerId: number; name: string; position: string; nflTeam: string } | null
}

export function buildAwardCards(
  decided: DecidedAward[],
  week: number,
  pools: PlaceholderPools,
): AwardCard[] {
  const byId = new Map(pools.teams.map((t) => [t.seasonTeamId, t]))
  // Engine keys ARE catalog keys, so there is no mapping layer to drift.
  const real = new Map(decided.map((a) => [a.key, a]))

  return AWARDS.map((def: AwardDef): AwardCard => {
    const computed = real.get(def.key)
    if (!computed) return placeholderAward(def, week, pools)

    return {
      def,
      teamId: computed.teamId,
      opponentId: computed.opponentId,
      playerName: computed.player?.name ?? null,
      espnPlayerId: computed.player?.espnPlayerId ?? null,
      playerMeta: computed.player
        ? `${computed.player.position} · ${computed.player.nflTeam}`
        : null,
      metricValue: computed.metricValue,
      metricTone: computed.metricTone,
      // Real and sample awards share one commentary builder, so the voice
      // cannot diverge between before and after week 1.
      commentary: buildCommentary(def.key, {
        managerFirst: firstName(byId.get(computed.teamId)?.manager),
        teamName: byId.get(computed.teamId)?.name ?? 'TBD',
        opponentTeam: computed.opponentId != null
          ? byId.get(computed.opponentId)?.name ?? null : null,
        opponentManager: computed.opponentId != null
          ? byId.get(computed.opponentId)?.manager ?? null : null,
        value: computed.metricValue,
        playerName: computed.player?.name ?? null,
        playerMeta: computed.player
          ? `${computed.player.position} · ${computed.player.nflTeam}`
          : null,
        // Every supporting stat, keyed by its label, so a builder can react to
        // the detail rather than just restate the headline number. The Waiver
        // Wire Wizard uses it to notice that the pickup never left the bench.
        extra: Object.fromEntries(computed.supporting.map((x) => [x.label, x.value])),
      }),
      supporting: computed.supporting,
      placeholder: false,
    }
  })
}

/**
 * Assembles the cards a week's award page renders.
 *
 * Real computation wins wherever the data supports it; everything else falls
 * back to a clearly-flagged placeholder so the layout can be judged before
 * week 1. The moment player scoring lands, the placeholders start being
 * replaced one award at a time — no page change required.
 */
import { AWARDS, type AwardDef } from './catalog'
import { computeWeeklyAwards, type AwardMatchup, type AwardPlayer } from './compute'
import { placeholderAward, type AwardCard, type PlaceholderPools } from './placeholder'
import { buildCommentary, firstName } from './commentary'

export function buildAwardCards(
  matchups: AwardMatchup[],
  week: number,
  pools: PlaceholderPools,
  players: AwardPlayer[] = [],
): AwardCard[] {
  const byId = new Map(pools.teams.map((t) => [t.seasonTeamId, t]))
  // Engine keys ARE catalog keys, so there is no mapping layer to drift.
  const real = new Map<string, ReturnType<typeof computeWeeklyAwards>[number]>(
    computeWeeklyAwards(matchups, week, players).map((a) => [a.key as string, a]),
  )

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
      }),
      supporting: computed.supporting,
      placeholder: false,
    }
  })
}

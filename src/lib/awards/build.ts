/**
 * Assembles the cards a week's award page renders.
 *
 * Real computation wins wherever the data supports it; everything else falls
 * back to a clearly-flagged placeholder so the layout can be judged before
 * week 1. The moment player scoring lands, the placeholders start being
 * replaced one award at a time — no page change required.
 */
import { AWARDS, type AwardDef } from './catalog'
import { computeWeeklyAwards, AWARD_TYPE_TO_KEY, type AwardMatchup } from './compute'
import { placeholderAward, type AwardCard, type PlaceholderPools } from './placeholder'

export function buildAwardCards(
  matchups: AwardMatchup[],
  week: number,
  pools: PlaceholderPools,
): AwardCard[] {
  const real = new Map<string, ReturnType<typeof computeWeeklyAwards>[number]>()
  for (const a of computeWeeklyAwards(matchups, week)) {
    const key = AWARD_TYPE_TO_KEY[a.type]
    if (key) real.set(key, a)
  }

  return AWARDS.map((def: AwardDef): AwardCard => {
    const computed = real.get(def.key)
    if (!computed) return placeholderAward(def, week, pools)

    return {
      def,
      teamId: computed.teamIds[0] ?? null,
      opponentId: computed.teamIds[1] ?? null,
      playerName: null,
      espnPlayerId: null,
      playerMeta: null,
      metricValue: computed.metric.value,
      headline: computed.headline,
      supporting: computed.supporting,
      placeholder: false,
    }
  })
}

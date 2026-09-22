/**
 * Weeks whose injury status ESPN can no longer tell us.
 *
 * ⚠️ THIS IS A HISTORICAL PATCH, NOT AN ONGOING MECHANISM. From week 3 of 2026
 * onward, `syncRosters` captures `injuryStatus` from `view=mRoster` as each
 * week is played, and that is accurate. Nothing should be added here for a week
 * the sync covered.
 *
 * It exists because ESPN has no historical injury endpoint — the API reports a
 * player's status TODAY, not during a past game. Weeks 1 and 2 were played
 * before we captured anything (the boxscore player object has no injuryStatus
 * field at all, so `game_status` was null on every row ever written), and
 * backfilling them from today's injury report gets anyone who has since
 * recovered exactly wrong.
 *
 * Kyler Murray is the case that forced this: a concussion from an illegal hit
 * ended his week 1 after one quarter, 0.62 against a 19.62 projection. He has
 * since cleared protocol, so ESPN now reports him ACTIVE, and the backfill
 * would have handed him Biggest Under-Performance — the precise pile-on the
 * exclusion rule exists to prevent.
 *
 * Every entry needs a reason a person can check. If it cannot be sourced, it
 * does not belong here — a silent exclusion list is a way to quietly reshape
 * the record book.
 */
export interface InjuryOverride {
  year: number
  week: number
  espnPlayerId: number
  playerName: string
  /** ESPN-style status to apply. Anything but ACTIVE excludes the row. */
  status: string
  /** Why, in a form somebody can verify. */
  reason: string
}

export const INJURY_OVERRIDES: InjuryOverride[] = [
  {
    year: 2026,
    week: 1,
    espnPlayerId: 3917315,
    playerName: 'Kyler Murray',
    status: 'OUT',
    reason:
      'Concussion from an illegal hit in Q1 of his Vikings debut; replaced by '
      + 'Carson Wentz. Verified during week 1 recap research. ESPN now reports '
      + 'him ACTIVE, having cleared protocol.',
  },
]

const KEY = (year: number, week: number, espnPlayerId: number) =>
  `${year}:${week}:${espnPlayerId}`

const BY_KEY = new Map(
  INJURY_OVERRIDES.map((o) => [KEY(o.year, o.week, o.espnPlayerId), o.status]),
)

/** The override for this player-week, or null to use whatever was stored. */
export const injuryOverrideFor = (
  year: number, week: number, espnPlayerId: number,
): string | null => BY_KEY.get(KEY(year, week, espnPlayerId)) ?? null

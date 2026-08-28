/**
 * ESPN magic numbers.
 *
 * ⚠️ Values here are corroborated but NOT fully verified against live rosters —
 * see AI-References/ESPN-API.md. Slot 7 (OP) eligibility in particular is
 * unconfirmed and gates the lineup optimizer. Do not treat as gospel.
 */

export const LINEUP_SLOT = {
  QB: 0, TQB: 1, RB: 2, RB_WR: 3, WR: 4, WR_TE: 5, TE: 6, OP: 7,
  DT: 8, DE: 9, LB: 10, DL: 11, CB: 12, S: 13, DB: 14, DP: 15,
  DST: 16, K: 17, P: 18, HC: 19, BENCH: 20, IR: 21, FLEX: 23,
} as const

export const LINEUP_SLOT_LABEL: Record<number, string> = {
  0: 'QB', 1: 'TQB', 2: 'RB', 3: 'RB/WR', 4: 'WR', 5: 'WR/TE', 6: 'TE', 7: 'OP',
  8: 'DT', 9: 'DE', 10: 'LB', 11: 'DL', 12: 'CB', 13: 'S', 14: 'DB', 15: 'DP',
  16: 'D/ST', 17: 'K', 18: 'P', 19: 'HC', 20: 'BE', 21: 'IR', 23: 'FLEX',
}

/** Slots that do not count toward the starting lineup. */
export const NON_STARTER_SLOTS: ReadonlySet<number> = new Set([
  LINEUP_SLOT.BENCH,
  LINEUP_SLOT.IR,
])

export const POSITION_LABEL: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'D/ST',
}

/** proTeamId -> abbreviation. Note the gaps: 31/32 are unused. */
export const PRO_TEAM: Record<number, string> = {
  0: 'FA', 1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR',
  15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI',
  22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WSH',
  29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
}

/**
 * ⚠️ THE HIGH-CONSEQUENCE ONE.
 *
 * Actual and projected points live in the SAME stats array on the same player,
 * distinguished only by statSourceId. Filtering wrong silently swaps real
 * scores for projections everywhere in the app.
 */
export const STAT_SOURCE = { ACTUAL: 0, PROJECTED: 1 } as const

export const ESPN_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl'

/** Views this app consumes. `mSchedule` is deliberately absent — see below. */
export const VIEWS = {
  STATUS: 'mStatus',
  SETTINGS: 'mSettings',
  TEAM: 'mTeam',
  ROSTER: 'mRoster',
  STANDINGS: 'mStandings',
  SCOREBOARD: 'mScoreboard',
  /**
   * ⚠️ The season schedule comes from mMatchupScore, NOT mSchedule.
   * Verified 2026-08-28: `?view=mSchedule` returns zero schedule entries.
   */
  MATCHUP_SCORE: 'mMatchupScore',
  BOXSCORE: 'mBoxscore',
  LIVE_SCORING: 'mLiveScoring',
  TRANSACTIONS: 'mTransactions2',
  DRAFT: 'mDraftDetail',
} as const

/**
 * The Moves column on /standings.
 *
 * James's definition: "the collective sum of free agent pickups, waiver claims,
 * and trades. I'm not interested in tracking when players get moved from bench
 * slots to active slots."
 */
import { describe, it, expect } from 'vitest'
import { countRosterMoves, type MoveRow } from '@/lib/league/queries'

const fa = (team: number): MoveRow => ({
  season_team_id: team, transaction_type: 'FREE_AGENT', transaction_items: [],
})
const waiver = (team: number): MoveRow => ({
  season_team_id: team, transaction_type: 'WAIVER', transaction_items: [],
})

describe('counting roster moves', () => {
  it('counts pickups and claims for the team that made them', () => {
    const c = countRosterMoves([fa(1), fa(1), waiver(1), fa(2)])
    expect(c.get(1)).toBe(3)
    expect(c.get(2)).toBe(1)
  })

  it('credits a trade to BOTH sides, not just the proposer', () => {
    // transactions.season_team_id holds only the team that proposed it, so
    // counting on that column alone credits one manager for a two-manager
    // decision. Week 1's Lawrence/Purdy swap was proposed by Justin and would
    // have counted for him and not for James.
    const trade: MoveRow = {
      season_team_id: 5,
      transaction_type: 'TRADE',
      transaction_items: [
        { from_team_id: 1, to_team_id: 5 },
        { from_team_id: 1, to_team_id: 5 },
        { from_team_id: 5, to_team_id: 1 },
        { from_team_id: 5, to_team_id: 1 },
      ],
    }
    const c = countRosterMoves([trade])
    expect(c.get(5)).toBe(1)
    expect(c.get(1)).toBe(1)
  })

  it('counts a trade once per side however many players move', () => {
    // Four players changed hands above; that is still one move each.
    const big: MoveRow = {
      season_team_id: 3,
      transaction_type: 'TRADE',
      transaction_items: Array.from({ length: 8 }, (_, i) => (
        i % 2 === 0 ? { from_team_id: 3, to_team_id: 4 } : { from_team_id: 4, to_team_id: 3 }
      )),
    }
    const c = countRosterMoves([big])
    expect(c.get(3)).toBe(1)
    expect(c.get(4)).toBe(1)
  })

  it('falls back to the proposer when a trade has no items', () => {
    const c = countRosterMoves([
      { season_team_id: 7, transaction_type: 'TRADE', transaction_items: null },
    ])
    expect(c.get(7)).toBe(1)
  })

  it('reports nothing for a team that has made no moves', () => {
    expect(countRosterMoves([fa(1)]).get(2)).toBeUndefined()
  })
})

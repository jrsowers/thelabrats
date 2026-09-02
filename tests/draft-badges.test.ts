import { describe, it, expect } from 'vitest'
import { badgeFor } from '../src/lib/draft/badges'
import type { FeedPick } from '../src/lib/draft/feed-data'

const pick = (o: Partial<FeedPick>): FeedPick => ({
  overallPickNumber: 20, round: 2, roundPick: 8, teamId: 1, teamName: 'T',
  manager: 'M', managerFull: 'M X', managerPhoto: null, playerId: 1,
  player: 'P', position: 'WR', proTeam: 'DET', leagueRank: 20, adp: 20,
  reachSlots: 0, betterAvailable: 0, roast: null, ...o,
})

describe('pick badges', () => {
  it('flags an early kicker', () => {
    expect(badgeFor(pick({ position: 'K', round: 9 }))?.label).toBe('U OK BRO?')
  })

  it('leaves a last-round kicker alone', () => {
    expect(badgeFor(pick({ position: 'K', round: 15 }))).toBeNull()
  })

  it('escalates reaches by how many better players were there', () => {
    expect(badgeFor(pick({ betterAvailable: 13 }))?.label).toBe('REACH')
    expect(badgeFor(pick({ betterAvailable: 25 }))?.label).toBe('U OK BRO?')
    expect(badgeFor(pick({ betterAvailable: 45 }))?.label).toBe('WTF')
  })

  it('rewards a player who fell', () => {
    expect(badgeFor(pick({ reachSlots: -12 }))?.label).toBe('STEAL')
    expect(badgeFor(pick({ reachSlots: -25 }))?.label).toBe('ROBBERY')
  })

  it('stays quiet on an ordinary pick', () => {
    expect(badgeFor(pick({ betterAvailable: 4, reachSlots: -2, round: 6 }))).toBeNull()
  })

  it('does not badge merely taking the best player available', () => {
    // It fired on seven of one manager's fifteen picks and turned the column
    // into a status readout rather than a verdict.
    expect(badgeFor(pick({ betterAvailable: 0, reachSlots: -3, round: 3 }))).toBeNull()
  })

  it('never contradicts itself: a reach is never also a steal', () => {
    const b = badgeFor(pick({ betterAvailable: 30, reachSlots: -25 }))
    expect(b?.tone).toBe('bad')
  })

  it('carries an explanation for every badge', () => {
    for (const p of [
      pick({ betterAvailable: 45 }), pick({ reachSlots: -25 }),
      pick({ position: 'K', round: 9 }), pick({ betterAvailable: 25 }),
    ]) {
      expect(badgeFor(p)?.title?.length).toBeGreaterThan(5)
    }
  })
})

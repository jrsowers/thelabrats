import { describe, it, expect } from 'vitest'
import { writeRoasts } from '../src/lib/draft/writer'
import { factSheet, templateRoast } from '../src/lib/draft/roast'
import type { PickAnalysis, DraftablePlayer, TeamMeta } from '../src/lib/draft/types'
import type { ScheduledRoast } from '../src/lib/draft/schedule'

const player = (id: number, name: string): DraftablePlayer => ({
  id, name, pos: 'RB', proTeam: 'DET', leagueRank: 10, adp: 12.5, injuryStatus: null,
})
const team = (id: number, first: string): TeamMeta => ({
  teamId: id, teamName: `${first}'s Team`, manager: `${first} X`, managerFirst: first,
})

const pick = (overall: number, teamFirst: string, playerName: string): PickAnalysis => ({
  overallPickNumber: overall, round: 1, roundPick: overall,
  team: team(overall, teamFirst), player: player(overall * 100, playerName),
  reachSlots: 2, adpSlots: 3, autodrafted: false,
  bestAvailable: null, betterAvailable: 0, passedOver: [],
  rosterAfter: { RB: 1 }, sameProTeamAlreadyRostered: [], isHandcuff: false,
  positionRun: 0, firstAtPosition: true, notability: 50, flags: [],
})

const scheduled = (p: PickAnalysis): ScheduledRoast =>
  ({ pick: p, theme: 'COST_TO_VALUE', alternates: [] })

describe('writeRoasts without an API key', () => {
  const batch = [
    scheduled(pick(1, 'Ada', 'Player One')),
    scheduled(pick(3, 'Bo', 'Player Two')),
    scheduled(pick(6, 'Cy', 'Player Three')),
  ]

  it('falls back to templates rather than leaving holes in the feed', async () => {
    const out = await writeRoasts(batch, { apiKey: '' })
    expect(out).toHaveLength(3)
    expect(out.every((o) => o.fallback)).toBe(true)
    expect(out.every((o) => o.text.length > 0)).toBe(true)
  })

  it('returns results keyed to the right pick, in order', async () => {
    // Regression guard. Batch POSITION and overallPickNumber are different
    // numbers (1,2,3 vs 1,3,6). An earlier version identified roasts by
    // position while the fact sheet exposed the overall number, and every
    // roast silently landed on the wrong manager.
    const out = await writeRoasts(batch, { apiKey: '' })
    expect(out.map((o) => o.overallPickNumber)).toEqual([1, 3, 6])
  })

  it('matches each fallback to its own pick', async () => {
    const out = await writeRoasts(batch, { apiKey: '' })
    for (const [i, o] of out.entries()) {
      expect(o.text).toBe(templateRoast(batch[i].pick))
    }
  })

  it('handles an empty batch', async () => {
    expect(await writeRoasts([], { apiKey: '' })).toEqual([])
  })
})

describe('factSheet', () => {
  it('exposes the pick number under an unambiguous name', () => {
    // `pick` was ambiguous against the batch position; the model used this
    // value as the id and the mapping broke.
    const f = factSheet(pick(7, 'Ada', 'Someone'))
    expect(f.overallPickNumber).toBe(7)
    expect(f).not.toHaveProperty('pick')
  })

  it('never leaks a field the writer is not allowed to cite', () => {
    const f = factSheet(pick(1, 'Ada', 'Someone'))
    expect(Object.keys(f)).not.toContain('notability')
  })
})

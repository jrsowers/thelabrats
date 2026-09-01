import { describe, it, expect } from 'vitest'
import { loadDossier, loadDossierRecords, tier2Players } from '../src/lib/draft/dossier'
import { eligibleThemes } from '../src/lib/draft/themes'
import type { PickAnalysis } from '../src/lib/draft/types'

const pick = (playerName: string): PickAnalysis => ({
  overallPickNumber: 20, round: 2, roundPick: 8,
  team: { teamId: 1, teamName: 'T', manager: 'M X', managerFirst: 'M' },
  player: { id: 1, name: playerName, pos: 'WR', proTeam: 'IND', leagueRank: 30, adp: 35, injuryStatus: null },
  reachSlots: 10, adpSlots: 15, autodrafted: false,
  bestAvailable: null, betterAvailable: 2, passedOver: [],
  rosterAfter: { WR: 1 }, sameProTeamAlreadyRostered: [], isHandcuff: false,
  positionRun: 0, firstAtPosition: false, notability: 40, flags: [],
})

describe('the news dossier', () => {
  const d = loadDossier()

  it('loads real entries', () => {
    expect(d.size).toBeGreaterThan(20)
  })

  it('every entry carries at least one note', () => {
    for (const [name, e] of d) {
      expect(e.notes.length, `${name} has no notes`).toBeGreaterThan(0)
    }
  })

  it('every record is tier 1 or tier 2', () => {
    for (const r of loadDossierRecords()) {
      expect([1, 2], `${r.player} has tier ${r.tier}`).toContain(r.tier)
    }
  })

  it('exposes off-field entries for review', () => {
    const t2 = tier2Players()
    expect(t2.length).toBeGreaterThan(0)
    expect(t2.map((e) => e.player)).toContain('Keenan Allen')
  })

  it('makes NEWS_CYCLE eligible only for players it covers', () => {
    const names = new Set(d.keys())
    const covered = eligibleThemes({ pick: pick('Keenan Allen'), dossierNames: names, totalRounds: 15 })
    const not = eligibleThemes({ pick: pick('Nobody At All'), dossierNames: names, totalRounds: 15 })
    expect(covered).toContain('NEWS_CYCLE')
    expect(not).not.toContain('NEWS_CYCLE')
  })

  it('degrades to empty rather than throwing when the file is missing', () => {
    // A missing dossier must never take the draft down mid-event.
    expect(loadDossier('/nonexistent/dossier.json').size).toBe(0)
    expect(tier2Players('/nonexistent/dossier.json')).toEqual([])
  })
})

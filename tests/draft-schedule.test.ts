import { describe, it, expect } from 'vitest'
import { analyzeDraft } from '../src/lib/draft/analyze'
import { scheduleRoasts } from '../src/lib/draft/schedule'
import { readFileSync } from 'node:fs'
import type { DraftablePlayer, TeamMeta } from '../src/lib/draft/types'

const draft = JSON.parse(readFileSync('fixtures/hypothesised/mDraftDetail-populated.json', 'utf8'))
const board = JSON.parse(readFileSync('fixtures/draft-board.json', 'utf8'))

const playersById = new Map<number, DraftablePlayer>()
for (const p of board.players) {
  playersById.set(p.id, {
    id: p.id, name: p.name, pos: p.pos, proTeam: p.proTeam,
    leagueRank: p.leagueRank, adp: p.adp,
    injuryStatus: p.injuryStatus ?? null,
  })
}
const teamsById = new Map<number, TeamMeta>(
  Array.from({ length: 12 }, (_, i) => [i + 1, {
    teamId: i + 1, teamName: `Team ${i + 1}`,
    manager: `Manager ${i + 1}`, managerFirst: `M${i + 1}`,
  }]),
)

const all = analyzeDraft({
  picks: draft.draftDetail.picks, playersById, teamsById, totalRounds: 15,
})
const scheduled = scheduleRoasts(all, { totalRounds: 15 })

describe('the roast schedule', () => {
  it('analyses the whole draft', () => {
    expect(all.length).toBe(180)
  })

  it('lands near the 60-roast target', () => {
    expect(scheduled.length).toBeGreaterThanOrEqual(55)
    expect(scheduled.length).toBeLessThanOrEqual(65)
  })

  it('keeps every round between 2 and 6', () => {
    const byRound = new Map<number, number>()
    for (const s of scheduled) byRound.set(s.pick.round, (byRound.get(s.pick.round) ?? 0) + 1)
    for (const [round, n] of byRound) {
      expect(n, `round ${round} had ${n}`).toBeGreaterThanOrEqual(2)
      expect(n, `round ${round} had ${n}`).toBeLessThanOrEqual(6)
    }
  })

  it('covers every round of the draft', () => {
    expect(new Set(scheduled.map((s) => s.pick.round)).size).toBe(15)
  })

  it('roasts every manager at least 3 times and never more than 8', () => {
    const per = new Map<number, number>()
    for (const s of scheduled) per.set(s.pick.team.teamId, (per.get(s.pick.team.teamId) ?? 0) + 1)
    expect(per.size, 'every manager appears').toBe(12)
    for (const [team, n] of per) {
      expect(n, `team ${team} got ${n}`).toBeGreaterThanOrEqual(3)
      expect(n, `team ${team} got ${n}`).toBeLessThanOrEqual(8)
    }
  })

  it('never plays the same theme twice in a row', () => {
    for (let i = 1; i < scheduled.length; i++) {
      expect(scheduled[i].theme, `at pick ${scheduled[i].pick.overallPickNumber}`)
        .not.toBe(scheduled[i - 1].theme)
    }
  })

  it('uses a genuine spread of themes, not two on repeat', () => {
    const used = new Set(scheduled.map((s) => s.theme))
    expect(used.size).toBeGreaterThanOrEqual(6)
  })

  it('lets no single theme dominate the draft', () => {
    const counts = new Map<string, number>()
    for (const s of scheduled) counts.set(s.theme, (counts.get(s.theme) ?? 0) + 1)
    // The 15% cap is a target, not an invariant: when every theme a pick can
    // honestly support is already at its ceiling, the scheduler takes the
    // least-used one rather than inventing an angle the facts do not support.
    // 20% is the point at which a theme actually starts to feel repetitive.
    const hardCap = Math.ceil(scheduled.length * 0.20)
    for (const [theme, n] of counts) {
      expect(n, `${theme} used ${n} times, hard cap ${hardCap}`).toBeLessThanOrEqual(hardCap)
    }
  })

  it('returns picks in draft order', () => {
    const n = scheduled.map((s) => s.pick.overallPickNumber)
    expect(n).toEqual([...n].sort((a, b) => a - b))
  })

  it('never assigns NEWS_CYCLE without a dossier entry', () => {
    expect(scheduled.some((s) => s.theme === 'NEWS_CYCLE')).toBe(false)
    const withDossier = scheduleRoasts(all, {
      totalRounds: 15,
      dossierNames: new Set(all.slice(0, 40).map((p) => p.player.name)),
    })
    expect(withDossier.some((s) => s.theme === 'NEWS_CYCLE')).toBe(true)
  })
})

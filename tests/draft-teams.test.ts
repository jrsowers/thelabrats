import { describe, it, expect } from 'vitest'
import { buildTeamMeta } from '../src/lib/draft/teams'

describe('buildTeamMeta', () => {
  const members = [
    { id: '{A}', firstName: 'Jesse', lastName: 'Anderson' },
    { id: '{B}', firstName: 'Chenell', lastName: 'Basilio' },
    { id: '{C}', firstName: 'Colin', lastName: 'Gray' },
  ]
  const teams = [
    { id: 1, name: 'Mr. Anderson', owners: ['{A}'] },
    { id: 2, name: 'Da Reigning Champ', owners: ['{B}'] },
    { id: 3, name: '4th and Inshes', owners: ['{C}'] },
  ]
  const meta = buildTeamMeta(teams, members)

  it('takes the manager name from members, never from the team name', () => {
    // Regression guard: splitting the team name yields "Mr.", "Da" and "4th".
    expect(meta.get(1)!.managerFirst).toBe('Jesse')
    expect(meta.get(2)!.managerFirst).toBe('Chenell')
    expect(meta.get(3)!.managerFirst).toBe('Colin')
  })

  it('keeps the team name separately', () => {
    expect(meta.get(3)!.teamName).toBe('4th and Inshes')
    expect(meta.get(1)!.manager).toBe('Jesse Anderson')
  })

  it('survives an unclaimed team without throwing', () => {
    const m = buildTeamMeta([{ id: 9, name: 'Orphan', owners: [] }], members)
    expect(m.get(9)!.manager).toBe('Team 9')
    expect(m.get(9)!.managerFirst).toBe('Team')
  })

  it('falls back to displayName when the real name is absent', () => {
    const m = buildTeamMeta(
      [{ id: 5, name: 'X', owners: ['{D}'] }],
      [{ id: '{D}', displayName: 'lurker99' }],
    )
    expect(m.get(5)!.manager).toBe('lurker99')
  })
})

import type { TeamMeta } from './types'

/**
 * Builds team → manager metadata from an mTeam payload.
 *
 * The manager's real name lives in `members[]`, joined to a team through
 * `team.owners[]` (a GUID). Deriving a first name from the TEAM name instead
 * produces "Mr." for "Mr. Anderson", "Da" for "Da Reigning Champ" and "4th"
 * for "4th and Inshes" — which is how the first draft of this read.
 */
export interface EspnMember {
  id: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
}
export interface EspnTeam {
  id: number
  name?: string | null
  owners?: string[] | null
}

export function buildTeamMeta(
  teams: EspnTeam[], members: EspnMember[],
): Map<number, TeamMeta> {
  const byGuid = new Map(members.map((m) => [m.id, m]))
  const out = new Map<number, TeamMeta>()

  for (const t of teams) {
    const owner = (t.owners ?? []).map((g) => byGuid.get(g)).find(Boolean)
    const first = owner?.firstName?.trim() || ''
    const last = owner?.lastName?.trim() || ''
    const full = [first, last].filter(Boolean).join(' ')
      || owner?.displayName?.trim()
      || `Team ${t.id}`

    out.set(t.id, {
      teamId: t.id,
      teamName: t.name?.trim() || `Team ${t.id}`,
      manager: full,
      // First name only — the league talks about each other by first name.
      managerFirst: first || full.split(' ')[0],
    })
  }
  return out
}

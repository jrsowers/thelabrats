import type { BracketRound, BracketSlot } from '@/lib/playoffs/bracket'
import type { StandingsTeam } from '@/lib/league/queries'
import { Eyebrow, TeamAvatar } from '@/components/ui/primitives'

/**
 * Bracket rendering. Rounds are columns on desktop and stack on mobile —
 * connector lines are decorative and drop on small screens rather than being
 * squeezed into something unreadable.
 */
function Slot({
  slot, teams,
}: { slot: BracketSlot; teams: Map<number, StandingsTeam> }) {
  const team = slot.seasonTeamId != null ? teams.get(slot.seasonTeamId) : undefined

  if (!team) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="w-4 shrink-0 text-center font-mono text-[11px] text-dim">—</span>
        <span className="truncate text-[12.5px] italic text-dim">
          {slot.placeholder ?? 'To be decided'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <span className="w-4 shrink-0 text-center font-mono text-[11px] font-bold text-brand tnum">
        {slot.seed}
      </span>
      <TeamAvatar
        photoUrl={team.photoUrl}
        logoUrl={team.logoUrl}
        abbrev={team.abbrev}
        size={26}
        champion={team.isChampion}
        championYear={team.championYear}
      />
      <div className="min-w-0">
        <div className="display truncate text-[14px] leading-tight">{team.name}</div>
        {team.manager && (
          <div className="truncate text-[10.5px] text-muted">{team.manager}</div>
        )}
      </div>
    </div>
  )
}

export function Bracket({
  rounds, teams,
}: { rounds: BracketRound[]; teams: Map<number, StandingsTeam> }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[680px] grid-cols-3 gap-4">
        {rounds.map((round) => (
          <section key={round.round} className="flex flex-col">
            <header className="mb-2.5 border-b border-border pb-1.5">
              <Eyebrow>Week {round.week}</Eyebrow>
              <h3 className="display mt-0.5 text-[15px]">{round.name}</h3>
            </header>

            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.games.map((game) => (
                <div
                  key={game.id}
                  className="overflow-hidden rounded-lg border border-border bg-surface"
                >
                  <Slot slot={game.home} teams={teams} />
                  <div className="border-t border-border" />
                  <Slot slot={game.away} teams={teams} />
                </div>
              ))}

              {round.byes.length > 0 && (
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-2/40 px-3 py-2.5">
                  <Eyebrow className="mb-1.5">First-round bye</Eyebrow>
                  <ul className="space-y-1">
                    {round.byes.map((b) => {
                      const team = teams.get(b.seasonTeamId)
                      return (
                        <li key={b.seed} className="flex items-center gap-2">
                          <span className="w-4 text-center font-mono text-[11px] font-bold text-brand tnum">
                            {b.seed}
                          </span>
                          <span className="display truncate text-[13px]">
                            {team?.name ?? 'TBD'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

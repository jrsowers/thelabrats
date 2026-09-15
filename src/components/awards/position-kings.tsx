import type { PublishedKing } from '@/lib/league/queries'
import { Eyebrow } from '@/components/ui/primitives'
import { PlayerHeadshot } from '@/components/ui/player-headshot'

/**
 * The best started player at each position, across the top of Studs & Duds.
 *
 * A STRIP, not seven more cards. The page already carries nineteen; adding a
 * card per position would bury the awards that take judgement under a league
 * leaderboard.
 *
 * It earns the top of the page because it is the only section that spreads
 * mechanically — one player cannot be the best quarterback and the best tight
 * end, so six rows reliably name four or five different managers, where the
 * nineteen awards below regularly collapse onto three.
 */
export function PositionKings({
  kings, teamName,
}: {
  kings: PublishedKing[]
  teamName: (teamId: number) => string
}) {
  if (kings.length === 0) return null

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="display text-2xl">Position Kings</h2>
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-dim">
          Best starter at each spot
        </p>
      </div>

      {/* TWO columns, never three. At three each row got about 70px of name
          and every king rendered as "CALEB W...", with the manager under him
          as "MR. ANDE...". A strip nobody can read is decoration. */}
      <ul className="grid gap-2 sm:grid-cols-2">
        {kings.map((k) => (
          <li
            key={k.position}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <span className="w-9 shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-dim">
              {k.position}
            </span>

            <PlayerHeadshot
              espnPlayerId={k.espnPlayerId}
              name={k.name}
              size={30}
              teamAbbrev={k.nflTeam}
              isTeamDefense={k.position === 'D/ST'}
            />

            <div className="min-w-0 flex-1">
              <div className="display truncate text-[15px] leading-tight">{k.name}</div>
              <div className="truncate font-mono text-[10px] uppercase tracking-wider text-dim">
                {teamName(k.teamId)}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="display text-[19px] leading-none tnum">{k.points.toFixed(1)}</div>
              {k.projectedPoints != null && (
                <div className="mt-0.5 font-mono text-[9.5px] text-dim tnum">
                  proj {k.projectedPoints.toFixed(1)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

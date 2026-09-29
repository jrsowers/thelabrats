'use client'

/**
 * The standings table, sortable by any column.
 *
 * The sorting rules — one row is one object, one sort at a time, ties fall
 * back to the seed, missing values last — live in `@/lib/standings/sort`,
 * where they are unit-tested. This file is the rendering.
 */

import { Fragment, useMemo, useState } from 'react'
import { TeamAvatar, LockIcon } from '@/components/ui/primitives'
import {
  SORT_COLUMNS, DEFAULT_SORT, columnById, nextSort, sortRows,
  type SortId, type Dir, type StandingsTableRow,
} from '@/lib/standings/sort'

export type { StandingsTableRow }

/**
 * Width and alignment per column, keyed by id.
 *
 * `Record<SortId, …>` rather than a field on the column list, so adding a
 * column to `SORT_COLUMNS` without styling it is a compile error rather than
 * a cell that silently renders at whatever width is left over.
 *
 * `head` goes on the `<th>`; `button` goes on the button, which fills the
 * cell so the whole header is clickable. The percentage widths need
 * `table-fixed` to be honored — without it the browser sizes columns by
 * content, the widest header takes the largest share of any leftover space,
 * and Playoff % drifts further from Moves the wider the window gets.
 *
 * Moves and Playoff % are hidden below 640px like PF, PA and Streak. At 320px
 * the table fits only rank, team and record; more columns there would crush
 * the team names beside them.
 */
const STYLE: Record<SortId, { head: string; button: string }> = {
  rank:    { head: 'sm:w-[9%]',                        button: 'px-3 sm:px-4' },
  team:    { head: 'sm:w-[28%]',                       button: 'px-2' },
  record:  { head: 'sm:w-[9%]',                        button: 'justify-end px-2' },
  pf:      { head: 'hidden sm:table-cell sm:w-[10%]',  button: 'justify-end px-2' },
  pa:      { head: 'hidden sm:table-cell sm:w-[10%]',  button: 'justify-end px-2' },
  streak:  { head: 'hidden sm:table-cell sm:w-[10%]',  button: 'justify-end px-2' },
  moves:   { head: 'hidden sm:table-cell sm:w-[10%]',  button: 'justify-end px-2' },
  playoff: { head: 'hidden sm:table-cell sm:w-[14%]',  button: 'justify-end px-3 sm:px-4' },
}

/** Green up, red down. Never color alone — the arrow and number carry it too. */
function Movement({ delta }: { delta: number }) {
  if (!delta) {
    return <span className="w-9 text-center font-mono text-[11px] text-dim" aria-hidden>—</span>
  }
  const up = delta > 0
  return (
    <span
      className={`flex w-9 items-center justify-center gap-0.5 font-mono text-[11px] font-semibold tnum ${
        up ? 'text-live' : 'text-loss'
      }`}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'place' : 'places'} since last week`}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {Math.abs(delta)}
    </span>
  )
}

/**
 * The sort indicator. Always present so the column width never changes when
 * the active column does, and so every header advertises that it is clickable
 * before anybody clicks one.
 */
function SortCaret({ active, dir }: { active: boolean; dir: Dir }) {
  return (
    <span
      aria-hidden
      className={`text-[8px] leading-none transition-opacity ${
        active ? 'text-brand opacity-100' : 'opacity-0 group-hover:opacity-45'
      }`}
    >
      {active && dir === 'asc' ? '▲' : '▼'}
    </span>
  )
}

export function StandingsTable({
  rows, playoffLine,
}: {
  rows: StandingsTableRow[]
  /** Seeds at or above this number make the playoffs. */
  playoffLine: number
}) {
  const [sort, setSort] = useState(DEFAULT_SORT)
  const column = columnById(sort.id)
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort])

  // The cut line marks the sixth SEED. In any other order the team sitting
  // sixth is not the sixth seed, and a rule drawn under it would be telling
  // the league something untrue — so it appears only in seed order.
  const inSeedOrder = sort.id === 'rank' && sort.dir === 'asc'
  const hasTeamsBelow = rows.length > playoffLine

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse text-left sm:min-w-[820px] sm:table-fixed">
        <caption className="sr-only">
          League standings, sorted by {column.label}, {column.reads[sort.dir === 'asc' ? 0 : 1]}.
          Select a column header to sort by it.
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            {SORT_COLUMNS.map((col) => {
              const active = col.id === sort.id
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={`p-0 ${STYLE[col.id].head}`}
                  aria-sort={
                    active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => setSort((s) => nextSort(s, col.id))}
                    title={col.title}
                    className={`group tap-target eyebrow flex w-full items-center gap-1 whitespace-nowrap py-2.5 transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${
                      active ? 'text-text' : ''
                    } ${STYLE[col.id].button}`}
                  >
                    {col.label}
                    <SortCaret active={active} dir={sort.dir} />
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <Fragment key={row.seasonTeamId}>
              <tr
                className={`state-bar border-b border-border bg-surface last:border-0 ${
                  row.eliminated ? 'opacity-55' : ''
                }`}
                style={{
                  '--state': row.inPlayoffs ? 'var(--brand)' : 'transparent',
                } as React.CSSProperties}
              >
                <td className="px-3 py-2.5 sm:px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="display w-5 text-[17px] tnum">{row.rank}</span>
                    <Movement delta={row.movement} />
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <TeamAvatar
                      photoUrl={row.photoUrl}
                      logoUrl={row.logoUrl}
                      abbrev={row.abbrev}
                      size={30}
                      champion={row.isChampion}
                      championYear={row.championYear}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="display truncate text-[15.5px] leading-tight">
                          {row.name}
                        </span>
                        {row.clinched && (
                          <span
                            className="shrink-0 text-brand"
                            title="Clinched playoff berth"
                            aria-label="Clinched playoff berth"
                            role="img"
                          >
                            <LockIcon />
                          </span>
                        )}
                        {row.eliminated && (
                          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-loss">
                            Out
                          </span>
                        )}
                      </div>
                      {row.manager && (
                        <div className="truncate text-[11px] text-muted">{row.manager}</div>
                      )}
                      {row.tiebreakNote && (
                        <div className="truncate font-mono text-[9.5px] text-dim">
                          {row.tiebreakNote}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-[13px] tnum">
                  {row.wins}-{row.losses}-{row.ties}
                </td>
                <td className="hidden px-2 py-2.5 text-right font-mono text-[13px] tnum sm:table-cell">
                  {row.pointsFor.toFixed(2)}
                </td>
                <td className="hidden px-2 py-2.5 text-right font-mono text-[13px] text-muted tnum sm:table-cell">
                  {row.pointsAgainst.toFixed(2)}
                </td>
                <td className="hidden px-2 py-2.5 text-right sm:table-cell">
                  {row.streak ? (
                    <span
                      className={`font-mono text-[13px] font-semibold tnum ${
                        row.streak.type === 'W' ? 'text-live'
                        : row.streak.type === 'L' ? 'text-loss' : 'text-muted'
                      }`}
                    >
                      {row.streak.type}-{row.streak.count}
                    </span>
                  ) : (
                    <span className="font-mono text-[13px] text-dim">—</span>
                  )}
                </td>
                {/* Both straight from ESPN, in COLUMNS order. */}
                <td className="hidden px-2 py-2.5 text-right font-mono text-[13px] tnum sm:table-cell">
                  {row.moves}
                </td>
                {/* playoffOdds is a 0-1 probability; a dash when ESPN has
                    published no simulation, which is honest rather than
                    printing 0%. */}
                <td className="hidden px-3 py-2.5 text-right font-mono text-[13px] tnum sm:table-cell sm:px-4">
                  {row.playoffOdds == null
                    ? <span className="text-dim">—</span>
                    : `${(row.playoffOdds * 100).toFixed(1)}%`}
                </td>
              </tr>

              {/* The cut line, labeled in place — a golf leaderboard's
                  projected cut rather than a bare rule. Rendered as a real
                  row so screen readers announce it between the sixth and
                  seventh team, where it means something. */}
              {inSeedOrder && hasTeamsBelow && row.rank === playoffLine && (
                <tr className="bg-brand/8">
                  <td colSpan={SORT_COLUMNS.length} className="px-3 py-0 sm:px-4">
                    <div className="flex items-center gap-2.5 py-1.5">
                      <span className="h-[3px] flex-1 rounded-full bg-brand" aria-hidden />
                      <span className="whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-brand">
                        Projected Playoff Cut
                      </span>
                      <span className="h-[3px] flex-1 rounded-full bg-brand" aria-hidden />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

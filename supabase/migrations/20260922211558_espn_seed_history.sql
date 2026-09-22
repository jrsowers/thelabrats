-- ESPN's playoff seed, week by week.
--
-- `standings_snapshots.seed` LOOKS like it already holds this. It does not: it
-- is `i + 1` from a local sort on win percentage then points-for, with no
-- head-to-head and no ESPN involvement at all. After week 2 of 2026 it
-- disagreed with ESPN's actual seeding for four of twelve teams.
--
-- That mattered because /standings displays ESPN's seeds while its movement
-- arrows were diffing a different table entirely, so six of twelve arrows were
-- wrong and the Free Fallin' award named the third-biggest faller as the
-- biggest. Fixing it needs a PRIOR week's ESPN seed to compare against, and
-- `espn_team_standings` is current-state only — it is overwritten on every
-- sync and cannot answer "where did this team sit last week".
--
-- Nullable on purpose: weeks captured before this column existed have no ESPN
-- seed and never will. Callers must treat a null as "no comparable table" and
-- withhold the movement rather than substituting another source.
alter table public.standings_snapshots
  add column if not exists espn_seed integer;

comment on column public.standings_snapshots.espn_seed is
  'ESPN playoff seed for this team after this week. The authoritative rank — '
  'ESPN owns the tiebreak rulebook. Null for weeks captured before 2026-09-22.';

comment on column public.standings_snapshots.seed is
  'LOCAL ordering only: win percentage, then points-for. NOT ESPN''s seed and '
  'not the rank shown on /standings — use espn_seed for that.';

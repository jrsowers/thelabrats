-- ESPN's own per-team move counter.
--
-- The standings page shipped a "Moves" column derived from our `transactions`
-- table and it disagreed with ESPN: 9 where ESPN said 6, and 9 where ESPN said
-- 7. ESPN applies counting rules invisible from the transaction feed — a re-add
-- of a player you just dropped, moves made before the first kickoff — and
-- CLAUDE.md is explicit that ESPN is the system of record.
--
-- So the number is stored rather than computed. `acquisitions` is waiver claims
-- plus free-agent adds, which is exactly the figure ESPN shows the manager.
-- move_to_active and move_to_ir are kept for completeness and are NOT part of
-- the Moves column: bench-to-starter churn is not a roster move.
alter table public.espn_team_standings
  add column if not exists acquisitions integer,
  add column if not exists drops integer,
  add column if not exists trades integer,
  add column if not exists move_to_active integer,
  add column if not exists move_to_ir integer;

comment on column public.espn_team_standings.acquisitions is
  'ESPN transactionCounter.acquisitions — waiver claims plus free-agent adds. '
  'The number ESPN shows the manager. Never re-derive it from transactions.';

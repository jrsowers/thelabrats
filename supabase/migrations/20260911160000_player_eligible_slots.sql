-- Slot eligibility, per player per week.
--
-- The lineup optimizer's constraint set. ESPN sends it on every roster entry
-- (`player.eligibleSlots`), the parser has been reading it since rosters were
-- first ingested, and the ingest then dropped it on the floor — so The
-- Mastermind and The Bench Bum had no way to know which players could legally
-- have filled which slots.
--
-- ⚠️ It is NOT derivable from `position`. A QB returns [0, 7, 20, 21]: slot 7
-- is the superflex OP, which competes with QB for the same players, and that
-- is precisely what makes a greedy bench substitution wrong in this league.
-- Some players also carry multi-position eligibility ESPN grants individually.
--
-- Stored per week rather than per player because eligibility can change
-- mid-season — a player who gains TE eligibility keeps the old weeks honest.
alter table player_week_scores add column eligible_slots int[] not null default '{}';

comment on column player_week_scores.eligible_slots is
  'ESPN lineup slot ids this player may legally occupy. The optimizer''s '
  'constraint set — see src/lib/lineup/optimize.ts.';

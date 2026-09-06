-- ESPN's own view of the standings and its playoff forecast.
--
-- We compute W-L-T, PF, PA, streak and seeding ourselves from `matchups`, and
-- that stays true — it is deterministic, unit-tested, and the only way to get
-- movement, tiebreak notes and week-by-week history. But ESPN is the system of
-- record (CLAUDE.md), it owns the tiebreaker rulebook, and it publishes two
-- things we cannot honestly reproduce:
--
--   * `playoffSeed` / `playoffClinchType` / `eliminated` — the official seed and
--     clinch state, decided by ESPN's own rules.
--   * `currentSimulationResults` — a Monte Carlo playoff forecast (odds,
--     projected finish, most-likely final record) that we would otherwise have
--     to invent.
--
-- Storing them lets the site mirror ESPN where ESPN is authoritative, and lets
-- us reconcile our arithmetic against theirs instead of silently disagreeing
-- with the app the league actually plays in.
--
-- One row per season team, upserted every sync. Current state, not history —
-- `standings_snapshots` already keeps the week-by-week record.

create table espn_team_standings (
  season_team_id     bigint primary key references season_teams(id) on delete cascade,
  season_id          bigint not null references seasons(id) on delete cascade,

  -- record.overall
  wins               int not null default 0,
  losses             int not null default 0,
  ties               int not null default 0,
  points_for         numeric(10,2) not null default 0,
  points_against     numeric(10,2) not null default 0,
  streak_type        text,
  streak_length      int not null default 0,
  games_back         numeric(6,2),

  -- Official seeding and postseason state
  playoff_seed       int,
  playoff_clinch     text,
  eliminated         boolean not null default false,
  elimination_week   int,
  final_rank         int,

  -- ESPN's forecast (view=mStandings)
  playoff_odds       numeric(6,5),
  projected_rank     int,
  projected_wins     int,
  projected_losses   int,

  waiver_rank        int,
  synced_at          timestamptz not null default now()
);

create index on espn_team_standings (season_id);

alter table public.espn_team_standings enable row level security;
create policy "public read" on public.espn_team_standings
  for select to anon, authenticated using (true);

-- The championship is TWO weeks in this league (matchupPeriods 16 -> [16,17]),
-- and ESPN says so per round via `playoffMatchupPeriodLengthByRound`. The
-- bracket was labelling every round as one week, which put the final on the
-- wrong week. Nothing here is hardcoded to 3 rounds or to this league.
alter table seasons add column playoff_round_lengths jsonb not null default '{}'::jsonb;

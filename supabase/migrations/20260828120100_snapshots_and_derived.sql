-- Snapshots, derived metrics, and editorial data.
--
-- Split from core because these are DERIVED or EDITORIAL (§13): a sync writes
-- source tables, calculation engines write these, and neither overwrites the
-- other. Snapshots exist from day one because history not captured now is gone
-- forever — retrofitting them later cannot recover the past.

-- ============================================================
-- Snapshots
-- ============================================================

-- Periodic live matchup snapshots (§14.7). NOT every few seconds — meaningful
-- score changes plus periodic checkpoints only.
create table matchup_snapshots (
  id                     bigint generated always as identity primary key,
  matchup_id             bigint not null references matchups(id) on delete cascade,
  captured_at            timestamptz not null default now(),
  home_score             numeric(8,2) not null,
  away_score             numeric(8,2) not null,
  home_projected_score   numeric(8,2),
  away_projected_score   numeric(8,2),
  -- Phase 2. Stays null until real event tracking exists — a fabricated
  -- probability is worse than none (see AI-References/METRICS.md).
  home_win_probability   numeric(5,4),
  away_win_probability   numeric(5,4)
);

create index on matchup_snapshots (matchup_id, captured_at desc);

create table roster_snapshots (
  id               bigint generated always as identity primary key,
  season_id        bigint not null references seasons(id)      on delete cascade,
  week             int    not null,
  season_team_id   bigint not null references season_teams(id) on delete cascade,
  player_id        bigint not null references players(id)      on delete cascade,
  lineup_slot_id   int    not null,
  captured_at      timestamptz not null default now(),
  -- Which end of the scoring period this represents.
  phase            text not null default 'PERIODIC'
                     check (phase in ('LOCK','FINAL','PERIODIC'))
);

create index on roster_snapshots (season_id, week, season_team_id);

create table standings_snapshots (
  id               bigint generated always as identity primary key,
  season_id        bigint not null references seasons(id)      on delete cascade,
  week             int    not null,
  captured_at      timestamptz not null default now(),
  season_team_id   bigint not null references season_teams(id) on delete cascade,
  wins             int not null default 0,
  losses           int not null default 0,
  ties             int not null default 0,
  points_for       numeric(10,2) not null default 0,
  points_against   numeric(10,2) not null default 0,
  seed             int,
  -- Derived metrics (§27, §28). Nullable until the engines exist.
  all_play_wins    int,
  all_play_losses  int,
  expected_wins    numeric(6,3),
  unique (season_id, week, season_team_id)
);

create table playoff_snapshots (
  id               bigint generated always as identity primary key,
  season_id        bigint not null references seasons(id)      on delete cascade,
  week             int    not null,
  captured_at      timestamptz not null default now(),
  mode             text   not null
                     check (mode in ('OFFICIAL','LIVE_IF_ENDED_NOW','PROJECTED')),
  season_team_id   bigint not null references season_teams(id) on delete cascade,
  seed             int,
  qualified        boolean not null default false,
  bye              boolean not null default false,
  -- Human-readable tiebreaker explanation (§21.6). Built from real values,
  -- never generated prose.
  tiebreaker_note  text
);

create index on playoff_snapshots (season_id, week, mode);

-- ============================================================
-- Awards (§14.14)
-- ============================================================

create table awards (
  id                    bigint generated always as identity primary key,
  season_id             bigint not null references seasons(id) on delete cascade,
  week                  int,
  award_type            text   not null,
  award_name            text   not null,
  recipient_type        text   not null check (recipient_type in ('TEAM','PLAYER','MATCHUP')),
  recipient_team_id     bigint references season_teams(id) on delete cascade,
  recipient_player_id   bigint references players(id)      on delete cascade,
  matchup_id            bigint references matchups(id)     on delete cascade,
  score                 numeric(10,3),
  headline              text,
  description           text,
  supporting_stats      jsonb,
  -- Mid-week awards must never masquerade as final (§22.8).
  is_provisional        boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (season_id, week, award_type)
);

create index on awards (season_id, week);

comment on table awards is
  'Regenerable. Deterministic from stored data — delete and recalculate freely.';

-- ============================================================
-- Editorial (§13) — never written by a sync
-- ============================================================

create table champions (
  id            bigint generated always as identity primary key,
  league_id     bigint not null references leagues(id)     on delete cascade,
  year          int    not null,
  franchise_id  bigint not null references franchises(id)  on delete cascade,
  -- The team name at the time, which may no longer exist.
  team_name     text,
  note          text,
  created_at    timestamptz not null default now(),
  unique (league_id, year)
);

comment on table champions is
  'EDITORIAL. Seasons predating this app have no ESPN data to ingest — 2025 is '
  'entered by hand. No sync may write here.';

-- ============================================================
-- Future-ready: NFL play tracking (Phase 2, §53)
-- ============================================================
-- Created now because the schema should not PREVENT these features (§9), and
-- adding them later would mean migrating live data.

create table nfl_games (
  id              bigint generated always as identity primary key,
  espn_event_id   text not null unique,
  season          int  not null,
  week            int  not null,
  home_team       text,
  away_team       text,
  status          text,
  start_time      timestamptz
);

create table nfl_plays (
  id             bigint generated always as identity primary key,
  nfl_game_id    bigint not null references nfl_games(id) on delete cascade,
  espn_play_id   text,
  sequence       int,
  period         int,
  clock          text,
  play_text      text,
  play_type      text,
  scoring_play   boolean not null default false,
  occurred_at    timestamptz,
  raw_payload    jsonb,
  unique (nfl_game_id, espn_play_id)
);

create index on nfl_plays (nfl_game_id, sequence);

create table fantasy_score_events (
  id                  bigint generated always as identity primary key,
  season_id           bigint not null references seasons(id)      on delete cascade,
  week                int    not null,
  season_team_id      bigint not null references season_teams(id) on delete cascade,
  player_id           bigint not null references players(id)      on delete cascade,
  matchup_id          bigint references matchups(id)  on delete cascade,
  captured_at         timestamptz not null default now(),
  previous_points     numeric(8,2),
  new_points          numeric(8,2),
  point_delta         numeric(8,2),
  linked_nfl_play_id  bigint references nfl_plays(id) on delete set null,
  match_confidence    numeric(4,3)
);

create index on fantasy_score_events (season_id, week, matchup_id);

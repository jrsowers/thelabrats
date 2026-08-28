-- Core schema for the Fantasy League Command Center.
--
-- Modeled on PRODUCT_SPEC §14, adapted to verified league facts:
--   * No auth (public, ungated site) -> no user tables.
--   * League does not use FAAB -> faab_amount kept nullable for portability.
--   * Nothing hardcoded to 12 teams / 6 playoff spots / 13 weeks (§60).
--
-- Convention: ESPN source data and derived data live in separate tables so a
-- sync can never overwrite a calculation, and editorial data is never
-- overwritten by a sync (§13).

-- ============================================================
-- League / season
-- ============================================================

create table leagues (
  id                bigint generated always as identity primary key,
  espn_league_id    bigint      not null unique,
  name              text        not null,
  timezone          text        not null default 'America/New_York',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table leagues is 'One row. Multi-league is explicitly out of scope (§60).';

create table seasons (
  id                     bigint generated always as identity primary key,
  league_id              bigint  not null references leagues(id) on delete cascade,
  year                   int     not null,
  status                 text    not null default 'PRESEASON'
                           check (status in ('PRESEASON','ACTIVE','COMPLETE')),
  regular_season_weeks   int     not null,
  final_scoring_period   int     not null,
  playoff_team_count     int     not null,
  seeding_rule           text,
  has_divisions          boolean not null default false,
  uses_faab              boolean not null default false,
  faab_budget            int,
  acquisition_type       text,
  -- lineupSlotId -> count. Drives the lineup optimizer; never hardcode.
  lineup_slot_counts     jsonb   not null default '{}'::jsonb,
  draft_type             text,
  draft_scheduled_at     timestamptz,
  draft_completed        boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (league_id, year)
);

-- ============================================================
-- Franchise identity (§25)
-- ============================================================

-- A franchise is the PERSISTENT manager identity across seasons. Team names
-- change yearly; ESPN team ids are not stable identifiers. The ESPN member
-- GUID is, so it is the natural key.
create table franchises (
  id               bigint generated always as identity primary key,
  league_id        bigint not null references leagues(id) on delete cascade,
  espn_member_id   text   not null,
  display_name     text   not null,
  manager_name     text   not null,
  short_name       text,
  logo_url         text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (league_id, espn_member_id)
);

comment on column franchises.espn_member_id is
  'ESPN member GUID. Stable across seasons and renames — the franchise key.';

-- One ESPN team in one season, mapped to a persistent franchise.
create table season_teams (
  id             bigint generated always as identity primary key,
  season_id      bigint not null references seasons(id)    on delete cascade,
  franchise_id   bigint          references franchises(id) on delete set null,
  espn_team_id   int    not null,
  team_name      text   not null,
  abbreviation   text,
  logo_url       text,
  division_id    int,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (season_id, espn_team_id)
);

create index on season_teams (franchise_id);

-- ============================================================
-- Players
-- ============================================================

create table players (
  id              bigint generated always as identity primary key,
  espn_player_id  bigint not null unique,
  full_name       text   not null,
  position        text,
  nfl_team        text,
  active          boolean not null default true,
  last_synced_at  timestamptz
);

-- ============================================================
-- Matchups
-- ============================================================

create table matchups (
  id                     bigint generated always as identity primary key,
  season_id              bigint not null references seasons(id) on delete cascade,
  espn_matchup_id        int    not null,
  -- Fantasy matchup period. NOT the NFL week — they diverge in the playoffs.
  matchup_period         int    not null,
  -- NFL scoring period.
  week                   int    not null,
  home_team_id           bigint references season_teams(id) on delete set null,
  away_team_id           bigint references season_teams(id) on delete set null,
  home_score             numeric(8,2) not null default 0,
  away_score             numeric(8,2) not null default 0,
  home_projected_score   numeric(8,2),
  away_projected_score   numeric(8,2),
  status                 text not null default 'SCHEDULED'
                           check (status in ('SCHEDULED','LIVE','FINAL')),
  winner_team_id         bigint references season_teams(id) on delete set null,
  margin                 numeric(8,2),
  is_playoff             boolean not null default false,
  last_synced_at         timestamptz,
  unique (season_id, espn_matchup_id, matchup_period)
);

create index on matchups (season_id, matchup_period);
create index on matchups (season_id, week);

comment on column matchups.matchup_period is
  'Fantasy matchup period. Distinct from week — a playoff period may span weeks.';

-- ============================================================
-- Player scoring
-- ============================================================

create table player_week_scores (
  id                bigint generated always as identity primary key,
  season_id         bigint not null references seasons(id)      on delete cascade,
  week              int    not null,
  player_id         bigint not null references players(id)      on delete cascade,
  season_team_id    bigint not null references season_teams(id) on delete cascade,
  lineup_slot_id    int    not null,
  lineup_slot       text   not null,
  is_starter        boolean not null,
  projected_points  numeric(8,2),
  actual_points     numeric(8,2),
  game_status       text,
  last_synced_at    timestamptz,
  unique (season_id, week, player_id, season_team_id)
);

create index on player_week_scores (season_id, week, season_team_id);

comment on column player_week_scores.is_starter is
  'False for bench (slot 20) and IR (slot 21). Drives lineup efficiency.';

-- ============================================================
-- Transactions
-- ============================================================

create table transactions (
  id                    bigint generated always as identity primary key,
  season_id             bigint not null references seasons(id) on delete cascade,
  espn_transaction_id   text   not null,
  transaction_type      text   not null
                          check (transaction_type in
                            ('WAIVER','FREE_AGENT','DROP','TRADE','DRAFT','OTHER')),
  status                text,
  season_team_id        bigint references season_teams(id) on delete set null,
  related_team_id       bigint references season_teams(id) on delete set null,
  proposed_at           timestamptz,
  processed_at          timestamptz,
  week                  int,
  -- Null in this league (traditional waivers). Kept for portability.
  faab_amount           int,
  raw_payload           jsonb,
  created_at            timestamptz not null default now(),
  unique (season_id, espn_transaction_id)
);

create index on transactions (season_id, processed_at desc);

comment on constraint transactions_season_id_espn_transaction_id_key on transactions is
  'Dedupe key. Syncs upsert on this — a transaction observed twice inserts once (§15.4).';

create table transaction_items (
  id                bigint generated always as identity primary key,
  transaction_id    bigint not null references transactions(id) on delete cascade,
  player_id         bigint not null references players(id)      on delete cascade,
  action            text   not null check (action in ('ADD','DROP','TRADE')),
  from_team_id      bigint references season_teams(id) on delete set null,
  to_team_id        bigint references season_teams(id) on delete set null
);

create index on transaction_items (transaction_id);

-- ============================================================
-- Observability (§41)
-- ============================================================

create table sync_runs (
  id                 bigint generated always as identity primary key,
  sync_type          text not null,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  status             text not null default 'RUNNING'
                       check (status in ('RUNNING','SUCCESS','FAILED')),
  records_processed  int  not null default 0,
  error_message      text,
  metadata           jsonb
);

create index on sync_runs (sync_type, started_at desc);

-- ============================================================
-- updated_at maintenance
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leagues_updated_at      before update on leagues      for each row execute function set_updated_at();
create trigger seasons_updated_at      before update on seasons      for each row execute function set_updated_at();
create trigger franchises_updated_at   before update on franchises   for each row execute function set_updated_at();
create trigger season_teams_updated_at before update on season_teams for each row execute function set_updated_at();

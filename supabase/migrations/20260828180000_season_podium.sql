-- Season podium: first, second and third place per season.
--
-- EDITORIAL (§13). The 2025 season was played on Yahoo, so there is no ESPN
-- data to ingest and never will be — it is entered by hand and no sync may
-- overwrite it.
--
-- franchise_id is NULLABLE on purpose. Membership changes between seasons:
-- Avery Smith finished second in 2025 but is not in the 2026 ESPN league, so
-- there is no franchise row to point at. Recording the name anyway is better
-- than dropping a real result because the person left.

create table season_podium (
  id            bigint generated always as identity primary key,
  league_id     bigint not null references leagues(id) on delete cascade,
  year          int    not null,
  place         int    not null check (place between 1 and 3),
  team_name     text   not null,
  manager_name  text   not null,
  -- Null when the manager is no longer in the league.
  franchise_id  bigint references franchises(id) on delete set null,
  record        text,
  created_at    timestamptz not null default now(),
  unique (league_id, year, place)
);

comment on table season_podium is
  'EDITORIAL. Final standings podium per season. franchise_id is null for '
  'managers who have since left the league.';

-- Title game detail, for the champion's card.
alter table champions add column title_game_opponent   text;
alter table champions add column title_game_score_for  numeric(8,2);
alter table champions add column title_game_score_against numeric(8,2);
alter table champions add column record text;
alter table champions add column platform text;

comment on column champions.platform is
  'Where the season was played. 2025 was Yahoo, hence no ESPN history.';

alter table season_podium enable row level security;
create policy "public read" on season_podium for select to anon, authenticated using (true);

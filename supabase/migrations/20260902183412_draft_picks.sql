-- The draft feed.
--
-- Lives in Postgres rather than a file because the deployed app cannot see the
-- runner's disk: on Vercel a fixture is frozen into the build, so picks written
-- locally during the draft would never reach a single viewer. Verified — a
-- local edit produced zero change on production.
--
-- One row per draft slot, including slots not yet used: ESPN pre-seeds the full
-- snake order, which is what lets the page say who is on the clock.

create table if not exists public.draft_picks (
  season            integer     not null,
  overall_pick      integer     not null,
  round             integer     not null,
  round_pick        integer     not null,

  espn_team_id      integer     not null,
  team_name         text        not null,
  manager           text        not null,
  manager_full      text,
  manager_photo     text,

  -- Null until the pick is made. ESPN uses -1 as its placeholder; null keeps
  -- "unmade" unambiguous and indexable.
  espn_player_id    integer,
  player_name       text,
  position          text,
  pro_team          text,
  league_rank       integer,
  adp               numeric(6,2),
  reach_slots       integer,
  better_available  integer,

  roast_text        text,
  roast_theme       text,
  roast_fallback    boolean     not null default false,

  is_sample         boolean     not null default false,
  updated_at        timestamptz not null default now(),

  primary key (season, overall_pick)
);

comment on table public.draft_picks is
  'One row per draft slot, pre-seeded with the snake order. player_name is null until the pick is made.';

create index if not exists draft_picks_season_overall_idx
  on public.draft_picks (season, overall_pick desc);

-- Powers the on-the-clock lookup: the first slot with nobody in it.
create index if not exists draft_picks_unmade_idx
  on public.draft_picks (season, overall_pick)
  where espn_player_id is null;

-- Same model as every other table here: anon reads, anon writes nothing.
-- Ingestion runs with the secret key, which bypasses RLS.
alter table public.draft_picks enable row level security;

drop policy if exists "public read" on public.draft_picks;
create policy "public read" on public.draft_picks
  for select to anon, authenticated using (true);

-- PostgREST caches the schema; without this the table 404s until it reloads.
notify pgrst, 'reload schema';

-- Row Level Security for a PUBLIC, UNGATED site.
--
-- There is no auth (James's decision, 2026-08-28), so `anon` is every visitor.
-- The model is therefore: anon may READ league data and may write NOTHING.
-- All ingestion runs server-side with the secret key, which bypasses RLS.
--
-- RLS is still mandatory (§34). Without it, PostgREST would expose these tables
-- for writes to anyone holding the publishable key — which is, by design, public.

-- ============================================================
-- Read-only public tables
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'leagues','seasons','franchises','season_teams','players','matchups',
    'player_week_scores','transactions','transaction_items',
    'matchup_snapshots','roster_snapshots','standings_snapshots',
    'playoff_snapshots','awards','champions',
    'nfl_games','nfl_plays','fantasy_score_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    -- SELECT only. No insert/update/delete policy exists, so those are denied
    -- for anon and authenticated by default.
    execute format($f$
      create policy "public read" on public.%I
        for select to anon, authenticated using (true)
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- Raw ESPN payloads are NOT public
-- ============================================================
-- raw_payload is retained for debugging (§33) and contains unfiltered ESPN
-- JSON, including member GUIDs. Readable server-side only.

revoke select (raw_payload) on public.transactions from anon, authenticated;
revoke select (raw_payload) on public.nfl_plays   from anon, authenticated;

-- ============================================================
-- sync_runs: private, with a safe public projection
-- ============================================================
-- Error messages can carry internal detail (URLs, payload fragments), so the
-- table stays private. The UI still needs "Last updated 28 sec ago" (§18), so
-- expose only what that requires.

alter table public.sync_runs enable row level security;
-- No policy: anon and authenticated get nothing.

create view public.sync_status
with (security_invoker = off) as
  select distinct on (sync_type)
    sync_type,
    started_at,
    finished_at,
    status,
    records_processed
  from public.sync_runs
  order by sync_type, started_at desc;

comment on view public.sync_status is
  'Safe public projection of sync_runs. Deliberately omits error_message and '
  'metadata, which may contain internal detail.';

grant select on public.sync_status to anon, authenticated;

-- When a matchup's score last actually MOVED.
--
-- The adaptive cadence needs to know "is football being played right now".
-- Its previous signal was `status = 'LIVE'`, which was fine while scores were
-- (wrongly) stuck at zero and is useless now that they are not: a fantasy
-- matchup is LIVE continuously from the Thursday kickoff to the Monday night
-- whistle, four days that are mostly not football. Polling every minute across
-- that span is ~5,700 requests to watch nothing happen on a Friday.
--
-- A moving score is the honest signal. It needs no game-window guesses, so it
-- covers the Saturday and holiday slates the windows deliberately omit, and it
-- stops on its own the moment the last game ends.
--
-- Written by the ingest only when the incoming score differs from the stored
-- one — never on every sync, or it would just be `last_synced_at` again.
alter table matchups add column score_changed_at timestamptz;

comment on column matchups.score_changed_at is
  'Last sync at which this matchup''s score actually changed. Drives the live '
  'sync cadence — see src/lib/sync/cadence.ts.';

create index on matchups (score_changed_at desc nulls last);

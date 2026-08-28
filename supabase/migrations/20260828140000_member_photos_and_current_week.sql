-- Manager photos and current-week tracking.

-- Editorial data (§13): supplied by the commissioner, never written by a sync.
-- Lives on `franchises` rather than `season_teams` because a person's photo
-- belongs to the persistent identity, not to one season's team.
alter table franchises add column photo_url text;

comment on column franchises.photo_url is
  'EDITORIAL. Path to a league member photo under /public/members. Preferred '
  'over the ESPN team logo. No sync may write this column.';

-- ESPN's own idea of where the season is, so the scoreboard can default to the
-- current week instead of hardcoding 1. Written by sync-league-metadata.
alter table seasons add column current_matchup_period int not null default 1;
alter table seasons add column latest_scoring_period  int not null default 0;

comment on column seasons.current_matchup_period is
  'From ESPN mStatus.currentMatchupPeriod. Drives default week selection.';

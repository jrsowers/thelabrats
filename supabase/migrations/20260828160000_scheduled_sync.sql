-- Scheduled ESPN sync.
--
-- pg_cron fires on a fixed 2-minute cadence; the APPLICATION decides whether
-- there is work to do (see src/lib/sync/cadence.ts). Encoding game windows in a
-- cron expression gets flex scheduling, overtime and the offseason wrong, and
-- cannot see whether a matchup is actually live.
--
-- The sync logic itself stays in TypeScript rather than being reimplemented as
-- an Edge Function: a second copy of the ESPN parsing in Deno would drift from
-- the first, which is exactly what the provider abstraction exists to prevent.
--
-- Secrets live in Vault, never in this file — the repository is public, and
-- cron.job stores its command as plain text readable by anyone with DB access.

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * Fire the sync endpoint. Reads its URL and bearer token from Vault so no
 * secret is committed or stored in the job definition.
 */
create or replace function public.trigger_espn_sync()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  secret   text;
begin
  select decrypted_secret into endpoint
    from vault.decrypted_secrets where name = 'sync_endpoint_url';
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'cron_secret';

  if endpoint is null or secret is null then
    raise warning 'trigger_espn_sync: vault secrets missing, skipping';
    return;
  end if;

  -- Fire and forget. pg_net is async; the response lands in net._http_response.
  perform net.http_get(
    url     := endpoint,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 55000
  );
end;
$$;

comment on function public.trigger_espn_sync is
  'Calls the app sync endpoint. Scheduled by pg_cron every 2 minutes; the app '
  'decides whether to act. Secrets read from Vault.';

-- Never expose this to the public API surface.
revoke all on function public.trigger_espn_sync() from anon, authenticated;

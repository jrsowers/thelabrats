-- FIX: raw_payload was readable by anon despite the column-level REVOKE in
-- 20260828120200.
--
-- Cause: in PostgreSQL a table-level SELECT grant covers every column, and a
-- column-level REVOKE against it is a no-op. Supabase grants table-level SELECT
-- to anon/authenticated by default, so the earlier revoke did nothing.
--
-- Correct pattern: REVOKE at table level, then GRANT the permitted columns
-- explicitly. Verified by canary test — see AI-References/DECISIONS.md.

do $$
declare
  t   text;
  cols text;
begin
  foreach t in array array['transactions', 'nfl_plays']
  loop
    -- Table-level SELECT must go first, or per-column grants are meaningless.
    execute format('revoke select on public.%I from anon, authenticated', t);

    -- Re-grant every column EXCEPT raw_payload. Built from catalog rather than
    -- a hardcoded list so new columns are included automatically and a future
    -- migration cannot silently drop one.
    select string_agg(format('%I', attname), ', ' order by attnum)
      into cols
      from pg_attribute
     where attrelid = format('public.%I', t)::regclass
       and attnum > 0
       and not attisdropped
       and attname <> 'raw_payload';

    execute format('grant select (%s) on public.%I to anon, authenticated', cols, t);
  end loop;
end $$;

comment on column public.transactions.raw_payload is
  'Server-side only. Unfiltered ESPN JSON including member GUIDs. Not granted to anon.';

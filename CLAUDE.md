# The Lab Rats Fantasy League — Command Center

Private fantasy football web app layered on an ESPN league. ESPN stays the
system of record; this is the analytics, entertainment, and history layer.

## Before writing code

1. `AI-References/SOUL.md` — identity, voice, non-negotiables
2. `AI-References/MEMORY.md` — current state and blockers
3. `Product Spec – The Lab Rats Fantasy League Command Center.md` — source of truth

## Hard rules

- **ESPN is never called from the browser.** Server-side only, behind
  `/src/lib/espn/`. No component knows an ESPN field name.
- **The LLM computes nothing.** Standings, seeds, awards, records, and metrics
  are deterministic and unit-tested. AI is a writing layer only.
- **Never invent an ESPN schema.** Inspect the payload, save a fixture, write the
  parser, document it. Everything in `ESPN-API.md` is unverified until confirmed.
- **Secrets stay server-side.** Never `NEXT_PUBLIC_` an ESPN cookie, service-role
  key, or API key. Never log them.
- **All ingest is idempotent.** Upsert on ESPN IDs; a second run changes nothing.
- **Nothing hardcoded to this league's shape.** Team count, playoff spots, and
  season length come from configuration.
- **Migrations for every schema change.** No manual table edits.
- **ESPN failure degrades, never breaks.** Serve last-known-good data with an
  honest "last updated" timestamp.

## Priority when tradeoffs bite

Data correctness → historical durability → security → reliability → usability →
visual polish → novel features.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Recharts · Vercel ·
Supabase (Postgres, Auth, Edge Functions, Realtime, pg_cron) · Resend · Zod

## Housekeeping

- Update `AI-References/MEMORY.md` at the end of every session.
- Log real decisions in `AI-References/DECISIONS.md`.
- Commit in logical increments; `main` stays deployable.
- Build against `/fixtures/` with `DEMO_MODE=true` — NFL games aren't always live.

## Gotchas that have bitten this integration

- `scoringPeriodId` (NFL week) ≠ `matchupPeriodId` (fantasy matchup). Store both.
- `statSourceId`: `0` = actual, `1` = projected. Both sit in the same array.
- Lineup slots: `20` = Bench, `21` = IR, `23` = FLEX.
- `mTransactions2` may require cookies even on a public league.
- Lineup optimization is a constrained assignment problem — greedy is wrong.

## Supabase access — CLI ONLY

**Never use the Supabase MCP tools (`mcp__supabase__*`) in this project.** They
are blocked in `.claude/settings.json`, and that block must stay.

The connected MCP is authenticated to a **different Supabase account** and points
at `jakuypixhizbyacemoxh`, an unrelated project. A stray MCP call would run
against someone else's database.

Use the Supabase CLI instead. It is linked to `fgtsewqcluffmcehqvvx`:

```bash
set -a; . ./.env.local; set +a   # loads SUPABASE_ACCESS_TOKEN
supabase migration new <name>
supabase db push
supabase gen types typescript --linked > src/types/supabase.ts
```

## GitHub

The `gh` CLI on this machine is authed as `merchyntjames`, which is **client
work**. Do not create or push this project there.

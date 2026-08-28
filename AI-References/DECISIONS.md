# Decision Log

Append-only. Newest at top. Every non-obvious technical or product decision, so
future sessions don't relitigate settled questions.

Format: **Date · Decision · Why · Alternatives rejected**

---

## 2026-08-28 · Scope: 2026 season only, no historical backfill
**Why:** James wants a fresh start; league data before 2026 isn't a priority.
**Consequence:** Record Books ships nearly empty in September and fills in as the
season runs. Franchise-mapping layer (§25) is still built now — retrofitting it
later would corrupt historical attribution.
**Open:** whether to import prior seasons after all, for launch-day substance.

## 2026-08-28 · Resend is an MVP dependency, not Phase 3
**Why:** Spec §10 mandates magic-link auth; Supabase's built-in auth mailer is
rate-limited to a few per hour and explicitly not production-grade. With ~12
managers logging in, that breaks on day one.
**Rejected:** password auth (worse UX, more support burden); deferring email
(blocks login entirely).

## 2026-08-28 · Live polling on Supabase pg_cron, not Vercel Cron
**Why:** Vercel Hobby caps cron at 2 jobs, once daily — nowhere near §15.5's
60-second target. Spec §5 independently reaches the same conclusion.
**Cost:** ~4,400 Edge Function invocations/month against a 500K free allowance.
30-second polling is affordable if wanted.

## 2026-08-28 · No image generation dependency
**Why:** Reviewed the full spec — nothing requires generated imagery. §58 uses
ESPN team logos; league logo is optional.
**Revisit if:** franchise avatars or AI recap header art are wanted later.

## 2026-08-28 · GitHub: not the `merchyntjames` account
**Why:** That account is reserved for client work. Account TBD.
**Blocking:** repo creation.

## 2026-08-28 · No authentication, no gating — public site
**Why:** James's call: no user profiles, no login, no password protection.
**Consequences:**
- Removes Resend/SMTP from MVP entirely (it existed only for magic links).
- Removes the auth allowlist and manager email collection.
- **Does NOT remove franchise/manager mapping** — still needed for display names,
  Record Books attribution, and award copy. ESPN supplies it free via
  `members[]` + `teams[].owners[]`, so no manual roster is needed either.
- RLS: anon gets SELECT on public tables, no writes. Service role writes only.
- **`/admin` still needs protection** — "Sync ESPN Now" and "recalculate records"
  cannot be world-callable. Resolved via shared secret, not user accounts.
- Real managers' names would be on the open internet. Display choice pending.

## 2026-08-28 · Phased build: minimal data slice first, then nav section by section
**Why:** James's global guidance. Prove we can pull, store, and refresh ESPN data
before building six features on top of an unproven pipeline.
**Supersedes:** the spec's §45–52 milestone ordering, which front-loads a full
app shell. Milestone 1 becomes a vertical slice, not a scaffold.

## 2026-08-28 · League verified fully public — no ESPN cookies needed
**Why:** Tested all 11 required views live. Every one returns 200 without auth,
including `mTransactions2`, which was the flagged risk.
**Consequence:** `ESPN_SWID` / `ESPN_S2` stay empty. Cookie code path is still
implemented so a future flip to private is a config change, not a code change.

## 2026-08-28 · League does not use FAAB
**Why:** `isUsingAcquisitionBudget: false`, `acquisitionType: WAIVERS_TRADITIONAL`.
**Consequence:** FAAB Bandit and FAAB Arsonist awards dropped. Transaction log
shows waiver priority, not dollars. "Largest FAAB bid" removed from season stats.
Schema column retained as nullable.

## 2026-08-28 · DB password stored in .env.local, not in memory files
**Why:** James asked for it saved in plain text since he isn't keeping a copy.
`.env.local` is gitignored and local-only, so it persists without entering model
context on every session the way a memory file would. Supabase also allows
resetting the DB password from the dashboard, so this is not a single point of
failure.

## 2026-08-28 · Supabase MCP hard-blocked; CLI is the only DB path
**Why:** The connected Supabase MCP is authenticated to a *different account*
(`supabase projects list` on James's token shows only `fgtsewqcluffmcehqvvx`;
`jakuypixhizbyacemoxh` is absent). A stray MCP call would hit an unrelated
database.
**How:** `.claude/settings.json` → `permissions.deny: ["mcp__supabase"]`. That is
harness-level enforcement, not a documentation request. Also stated in CLAUDE.md.
**Alternative rejected:** repointing the connector — still one global setting for
an account that manages multiple clients' projects, and still a single
mis-selection away from the wrong database. Per-directory CLI linking has no
global state.

## 2026-08-28 · New-format Supabase keys, not legacy anon/service_role
**Why:** Legacy JWT keys share the project's JWT secret, so rotating one forces
rotating all. New `sb_publishable_` / `sb_secret_` keys revoke independently, and
the legacy pair is on a deprecation path.
**Note:** env var renamed `SUPABASE_SERVICE_ROLE_KEY` -> `SUPABASE_SECRET_KEY`.

## 2026-08-28 · Display: team name primary, real manager name secondary
**Why:** James's call. "Da Reigning Champ / Manager: Chenell Basilio".
**Consequence:** Real names ship on a public, ungated site — accepted knowingly.
Manager name never appears without its team name.

## 2026-08-28 · 2025 champion is editorial data, not ingested
**Why:** Chenell Basilio won 2025, but ESPN holds no 2025 season under this
league ID. Nothing to sync.
**How:** `champions` table keyed to `franchise_id`, seeded by migration. Marked
editorial (§13) so no sync ever overwrites it. Keyed to franchise, not team, so
it survives renames.

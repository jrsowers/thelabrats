# Project Memory

Running state of the build. **Update this at the end of every working session.**
A future session should be able to read this file and `SOUL.md` and resume
without re-reading the conversation.

**Last updated:** 2026-08-29 (session 3)

---

## Current status

**Phase:** Milestone 1 in progress. ESPN adapter built and tested. Supabase
linked. Nothing pushed to GitHub yet — awaiting go-ahead on the first push
(public repo + triggers a Vercel deploy).

**What exists:** Next.js 16.3.3 / React 19.2.8 scaffold, `src/lib/espn/`
(client, constants, types, schemas, transforms), 19 passing fixture tests,
sanitized `fixtures/` + leak checker, `AI-References/`, `.claude/settings.json`
(Supabase MCP denied), Supabase CLI linked to `fgtsewqcluffmcehqvvx`.
2 local commits on `main`.

**Session 3 — deploy pipeline verified end to end.** Edited homepage copy,
pushed to `main`, watched the Vercel build go Ready in 20s, and confirmed the
new string in the *rendered HTML* at www.labratsfantasy.com. `/standings`,
`/awards`, `/records`, `/playoffs` all 200. The full loop works:
edit → test → push → auto-deploy → live.

**Tooling note:** neither `vercel` nor `supabase` is installed globally, and
`npm config prefix` is `/usr/local` (not writable without sudo). Use
`npx --yes vercel@latest` / `npx --yes supabase@latest` — both work fine.
`VERCEL_TOKEN` is now in `.env.local`; pass it as `--token "$VERCEL_TOKEN"`.

⚠️ **The repo lives on an iCloud-synced Desktop.** This makes `tsc` badly
I/O-bound — ~41s wall at 7% CPU, and it has stalled outright at 0% CPU for
minutes while iCloud syncs. `npm test` is unaffected (~180ms). If a command
seems hung, suspect iCloud before suspecting the code. Moving the repo to
`~/dev/thelabrats` would fix it (offered; James declined for now).

**Verification:** `npm test` (115 ✅, 8 files) · `npm run typecheck` (✅) ·
`npm run fixtures:check` (✅) · `npm run verify:rls` (10/10 ✅) · build ✅

**Deployed:** LIVE at www.labratsfantasy.com. 21 env vars set across
production/preview/development. Preview vars are scoped to the `development`
branch because CLI 54.6.1 rejects the all-preview-branches form even with
`--yes` (returns `action_required`/`git_branch_required` while echoing back the
exact command it just refused).

⚠️ **Framework preset gotcha:** the Vercel project was imported while the repo
was empty, so detection set Framework Preset = "Other". Build logs looked
perfectly healthy (Next.js built, route `ƒ /` listed) but Vercel served the
static `public/` dir and ignored `.next` — every route 404'd. Pinned via
`vercel.json` `{"framework": "nextjs"}`. A green build log is not evidence the
site works.

---

## League facts

| Fact | Value |
| --- | --- |
| League name | The Lab Rats |
| Season | 2026 |
| Commissioner | James (jamesrsowers@gmail.com) |
| ESPN league ID | `793230160` ✅ |
| Public league | ✅ **Verified** — all 11 views, 200, no cookies |
| Team count | **12** ✅ |
| Playoff teams | **6** ✅ |
| Regular season weeks | **13** matchup periods; final scoring period 17 ✅ |
| Seeding rule | `H2H_RECORD` ✅ |
| Divisions | None (one nominal division) ✅ |
| FAAB | ❌ **Not used** — traditional waivers, 48h ✅ |
| Roster | QB/RB×2/WR×2/TE/OP/FLEX/DST/K + 5 bench + 1 IR ✅ |
| Timezone | `America/New_York` ✅ confirmed |
| Draft | **Thu Sept 3, 2026, 1:00 PM** — SNAKE, not yet held ✅ |
| Auth | ❌ **None** — fully public, ungated |

Full detail in `LEAGUE-CONFIG.md`.

---

## Decided

- **No auth, no gating.** Public site. (Kills the Resend/MVP dependency.)
- **Phased build:** minimal data slice first, then nav sections one at a time.
- 2026 season only. Record Books starts as a single "Past Champions" entry.
- Live polling via Supabase pg_cron, not Vercel Cron.
- No image generation needed. No ESPN cookies needed.
- FAAB awards dropped — league doesn't use FAAB.
- GitHub: **`jrsowers/thelabrats`**, never `merchyntjames`.

Full rationale in `DECISIONS.md`.

---

## Pending work

- Seed 2025 champion (Chenell Basilio) — blocked on first ingestion creating
  franchises; `champions.franchise_id` has nothing to reference yet.

## LIVE

**https://www.labratsfantasy.com** — HTTP 200, real league data, ungated.
Apex, www, and `thelabrats-gray.vercel.app` all resolve.

## Not blocked on anything

## Previously blocked

1. ~~**Go-ahead to push**~~ — first push publishes to a public repo and triggers a
   Vercel deploy
2. **2025 champion** — who won, and under what ESPN league ID (if any)
3. **Display names** — real names / first names / team names only (public site)

## Resolved this session

~~Supabase keys~~ → new-format publishable + secret, in `.env.local`
~~Supabase MCP~~ → hard-denied; CLI linked instead
~~gh auth~~ → not needed; SSH `git@github.com` already resolves to `jrsowers`
~~2025 champion~~ → Chenell Basilio
~~Display names~~ → team name primary, real manager name secondary

## Resolved since last session

~~GitHub account~~ → `jrsowers/thelabrats` (public, empty)
~~ESPN league ID~~ → `793230160`, verified public
~~ESPN cookies~~ → not needed
~~Manager roster~~ → auto-derived from ESPN `members[]`
~~League settings screenshots~~ → pulled from `mSettings` directly
~~Resend~~ → not needed, no auth
~~Timezone~~ → `America/New_York`
~~Draft timing~~ → Sept 3, 2026

## Open questions

- **Display names:** real names on a public site, first names only, or team names
  only? Real people, open internet.
- **`/admin` protection** mechanism, given no user accounts.
- Slot 7 "OP" — superflex or not? Blocks the lineup optimizer. Verify post-draft.

---

## Environment (verified 2026-08-28)

| Tool | Status |
| --- | --- |
| Node | v22.22.1 ✅ |
| npm | 10.9.4 ✅ |
| gh CLI | authed as `merchyntjames` — **unused**; SSH handles git as `jrsowers` ✅ |
| Vercel CLI | 54.6.1 ✅ (login state unchecked) |
| Supabase CLI | 2.116.0 ✅ linked to `fgtsewqcluffmcehqvvx` |
| git | 2.50.1 ✅ |
| Supabase MCP | 🚫 **DENIED** in `.claude/settings.json` — different account |
| Vercel MCP | ❌ needs OAuth; unavailable in non-interactive session |

---

## Milestones (§45–52)

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Foundation — scaffold, ESPN adapter, migrations, RLS, ingestion, preview mode | ✅ |
| 2 | ESPN league import | ✅ |
| 3 | Live Scoreboard | ✅ (live polling still to come) |
| 4 | Standings — H2H tiebreak, movement, clinching | ✅ |
| 5 | Playoff Picture — bracket + bubble | ✅ |
| 6 | Transactions | 🔨 UI + filters done; parser unverified until a real move |
| 7 | Studs & Duds | 🔨 7 of 14 awards; player awards need week 1 |
| 8 | Record Books | ✅ Champions Corner + Firsts and Worsts (records accumulate) |

---

## Session log

**2026-08-28 (session 2)** — Received repo, Vercel project, Supabase URL + DB
password, ESPN league ID. **Verified ESPN API live:** league is fully public, all
11 views return 200 with no cookies (`mTransactions2` risk cleared). Captured 9
fixtures to `/fixtures/raw/`. Extracted full league config → `LEAGUE-CONFIG.md`:
12 teams, 13-week season, 6 playoff teams, H2H_RECORD seeding, no divisions, no
FAAB, 10-starter lineup with an OP slot, draft Sept 3. Franchise mapping derived
automatically from ESPN member GUIDs. Discovered `mSchedule` returns nothing —
schedule lives in `mMatchupScore`. Confirmed no 2025 season exists in ESPN.
James set: no auth/gating, phased minimal-first build, ET timezone.

**2026-08-28 (session 1)** — Reviewed full 3,347-line spec. Verified local tooling.
Discovered Supabase MCP points at an unrelated project. Flagged Resend as an MVP
dependency (spec had it as Phase 3) and image generation as unnecessary.
Delivered human setup checklist. Created `AI-References/`, `.gitignore`,
`.env.example`. Repo creation halted — wrong GitHub account.

## Session 4 — 2026-08-29 (responsive)

Responsiveness is now enforced, not audited. `npm run test:responsive` drives
real Chromium over every route at five widths. Routes come from walking
`src/app`, so new pages are covered automatically — do not add a route list.

Fixed: eight sub-44px tap targets (`.tap-target`), missing
`env(safe-area-inset-bottom)` + `viewportFit: 'cover'`, no `<main>` landmark on
seven pages, the scoreboard's three-column layout crushed at 390px (now stacks
below `sm`), and standings hiding W-L-T behind a scroll on phones.

**The suite is a floor, not a ceiling.** It proves nothing is broken; it cannot
tell you something looks bad. The scoreboard truncation passed every assertion
and was only caught by looking at a screenshot. Keep screenshotting at 390px.

Known: standings still scrolls at 320px (needs 347px). Accepted — closing it
means shrinking manager avatars, which James asked to enlarge.

Still open: AI recap prose + award commentary voice (deferred to a joint pass —
commentary is currently 12 hardcoded templates, identical every week).


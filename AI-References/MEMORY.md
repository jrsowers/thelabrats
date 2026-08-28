# Project Memory

Running state of the build. **Update this at the end of every working session.**
A future session should be able to read this file and `SOUL.md` and resume
without re-reading the conversation.

**Last updated:** 2026-08-28 (session 2)

---

## Current status

**Phase:** Pre-Milestone 1. ESPN API fully verified. Ready to scaffold once
Supabase keys land and `gh` is authed as the right account.

**What exists:** `AI-References/`, `.gitignore`, `.env.example`, `.env.local`
(populated), `CLAUDE.md`, `/fixtures/raw/` (9 live ESPN payloads), the spec.
No application code yet. Nothing pushed to the repo yet.

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

## Blocked on James

1. **Supabase anon + service-role keys** — blocks all DB work
2. **Repoint Supabase MCP** from `jakuypixhizbyacemoxh` to `fgtsewqcluffmcehqvvx`
3. **`gh auth login` as `jrsowers`** — `gh` is authed as `merchyntjames`, which
   cannot push to `jrsowers/thelabrats`
4. **2025 champion** — who won, and under what ESPN league ID (if any)

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
| gh CLI | 2.89.0, authed as `merchyntjames` ⚠️ **wrong account — needs `jrsowers`** |
| Vercel CLI | 54.6.1 ✅ (login state unchecked) |
| Supabase CLI | ❌ not installed — I'll install |
| git | 2.50.1 ✅ |
| Supabase MCP | ⚠️ still pointed at `jakuypixhizbyacemoxh`; needs repoint to `fgtsewqcluffmcehqvvx` |
| Vercel MCP | ❌ needs OAuth; unavailable in non-interactive session |

---

## Milestones (§45–52)

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Foundation — scaffold, auth, nav, migrations, demo mode | ⬜ |
| 2 | ESPN league import | ⬜ |
| 3 | Live Scoreboard | ⬜ |
| 4 | Standings | ⬜ |
| 5 | Playoff Picture | ⬜ |
| 6 | Transactions | ⬜ |
| 7 | Studs & Duds | ⬜ |
| 8 | Record Books | ⬜ |

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

# Project Memory

Running state of the build. **Update this at the end of every working session.**
A future session should be able to read this file and `SOUL.md` and resume
without re-reading the conversation.

**Last updated:** 2026-09-11

---

## Current status

**2026-09-11 — week 1 in progress, live scoring works.** Two NFL games final,
the Sunday slate ahead. The scoreboard shows real live scores, the sync
escalates to one-minute polling while scores are moving, and
`player_week_scores` is being collected for the first time. Studs & Duds now
computes four awards for real; two more need the lineup optimizer and two need a
transaction-to-scoring join. See Session 8.

**2026-09-06 — season live, week 1 not yet played.** The draft is done, the
recap and report cards are published, the transaction log is running against
real moves, and ESPN's own standings and playoff forecast are mirrored into
Postgres. Standings read 0-0 across the board because no NFL game has gone
final yet — that is correct, not a bug, and it is the reason the tables look
like sample data. See Session 7.

**2026-09-02 — Fantasy Roster Management skill added.** New agent skill at
`.claude/skills/fantasy-roster-management/` (outside the app): a weekly
Tuesday waiver-wire / roster report across *all* of James's leagues (this one
plus Yahoo leagues), intended to run as a scheduled Claude cloud routine
against this repo and deliver via Slack webhook / Resend email. Config in the
skill's `config/leagues.yaml` (Lab Rats pre-filled, others pending); secrets
go in the cloud environment's env vars, never in git. Verified live:
Sleeper trending API, ESPN public scoreboard, and `kona_player_info`
free-agent filtering. Pending: James's other league IDs, Yahoo developer app
+ refresh token, delivery webhook/key, and creating the routine itself.

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
| Roster | QB/RB×2/WR×2/TE/OP/FLEX/DST/K + 5 bench + **2 IR** ✅ |
| OP slot | **Superflex** ✅ confirmed by the draft |
| Playoff rounds | QF 14 · SF 15 · **Championship 16–17 (two weeks)** ✅ |
| Playoff reseed | ❌ None — fixed bracket ✅ |
| Timezone | `America/New_York` ✅ confirmed |
| Draft | **Thu Sept 3, 2026, 1:00 PM** — SNAKE, **held** ✅ |
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
- Profanity: `ROAST-WRITER.md` permits it; never explicitly confirmed by James.

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
| 3 | Live Scoreboard | ✅ live scores + adaptive polling verified in week 1 |
| 4 | Standings — H2H tiebreak, movement, clinching | ✅ |
| 5 | Playoff Picture — bracket + bubble + ESPN's odds | ✅ |
| 6 | Transactions | ✅ Verified against real adds, drops, a trade and IR moves |
| 7 | Studs & Duds | ✅ all 12 computed, published Tuesday mornings |
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

## Session 5 — 2026-09-01 (draft day build)

Draft is **Thursday 3 Sept, 1:00 PM EDT**. 180 picks, 15 rounds, 60s per pick.

Built: the roast engine (analyze → themes → schedule → write), the league's own
VOR board, the news dossier, and all three pages (`/draft`, `/draft/recap`,
`/draft/recap/[name]`). All noindex. Full rationale in `DRAFT-DAY.md`.

**ESPN mDraftDetail is public, no cookies.** All 180 picks are pre-seeded with
`playerId: -1` and the snake order, with `drafted`/`inProgress` flags. Picks are
CUMULATIVE STATE, not an event stream — a poller that dies loses nothing.

**Unverifiable until Thursday:** whether ESPN populates `playerId` live during
the draft or only at completion. The `inProgress` flag implies live but 2025 was
on Yahoo so there is no fixture to prove it. Everything is built to work either
way — live feed if live, recap source if not.

**The lesson from this session:** four of five real bugs were only findable by
running it. Reading the code would not have caught the misattributed roasts, the
dropped defenses, or the wrong feed ordering. Generate output and look at it.

Live runner shipped (`scripts/draft-live.ts`), verified against the real ESPN
endpoint. Open: voice tuning (together), superlatives design, `/draft` is not
linked from anywhere in the UI, tier-2 dossier review, and the Yahoo 2025
export for the reunion-tour theme.

## Session 6 — 2026-09-02 (voice and pages)

The roast voice now loads **two** documents: `ROAST-WRITER.md` (James's craft
spec — joke engines, rhythm, freshness, the quality test) then `ROAST-BIBLE.md`
(the league layer — who may be roasted, superflex facts, accuracy). Craft spec
wins where they overlap.

**The lesson of this session:** an instruction-only rule has now slipped five
times — invented injury status, British spelling, grades restated in prose, a
gendered collective in a headline, and 56 of 60 roasts running past the word
cap. Anything mechanical belongs in `validate.ts`, not in prose. The recap
generator was bypassing the checks entirely and shipped 28 em dashes against a
spec that bans them; it now audits and repairs.

Also: `/draft` shows a countdown instead of sample data until picks land, the
sample draft has been cleared from Postgres, and badges are assigned per manager
(3 bad, 3 mildly bad, 1 good, minimum five) rather than judged per pick.

**Dropped:** draft superlatives. James called scope, 2026-09-02.

Open: tier-2 dossier review, the ROBBERY badge is untested, Yahoo 2025 export.


## Session 7 — 2026-09-06 (transaction colours, ESPN standings)

**Neither `/standings` nor `/playoffs` was ever hardcoded.** James read them as
sample data; at 0-0 across twelve teams that is a fair reading. Both compute
from ingested matchups and always have. What *was* wrong is that we discarded
everything ESPN publishes about its own standings.

`mTeam` carries the official record, `playoffSeed`, `eliminated` and the final
ranks. `mStandings` — and **only** `mStandings` — carries `playoffClinchType`
and a Monte Carlo forecast: playoff odds, projected finish, most likely final
record. Both ride free on the request the sync already makes, both work
anonymously. They now land in `espn_team_standings` and drive the seeding, the
clinch calls, and a new odds section on `/playoffs`.

**The trap to remember:** before week 1, ESPN fills `playoffSeed` with reverse
draft order — a real integer that is not a standing. `reconcileWithEspn()`
ignores it until a game is final, and ignores any partial or duplicated seed
set. Likewise `playoffClinchType: "UNKNOWN"` means undecided, not "not
clinched", and `0` in `eliminationMatchupPeriod` / `rankCalculatedFinal` means
"has not happened".

**Fixed a factual error on the bracket.** The championship is two weeks (16–17),
which ESPN reports in `playoffMatchupPeriodLengthByRound`. Every round was
labelled one week.

**Injured reserve was printing as a drop.** ESPN has no IR transaction type — an
IR move is a `ROSTER` row with an ordinary ADD/DROP item action, visible only in
the lineup slot crossing 21. Now `IR_PLACE` / `IR_ACTIVATE`, with their own
filter, kept out of Players Added and Players Dropped. All six transaction kinds
now carry their own colour; IR got a new `--violet` token so an injury never
reads as a waiver claim.

**A swallowed error hid a real trade for two days.** The transaction upsert
destructured only `data`, so a failing write reported SUCCESS on every sync.
That is now the second silent failure to cost a day (the first: an empty
migration file that `db push` recorded as applied). Every ingest write throws on
error and checks its row count.

**Fixtures re-captured post-draft**, which moved two facts the old assertions
pinned: IR is two slots now, and the draft is done.

**Verification:** `npm test` (209 ✅, 15 files) · `npx tsc --noEmit` ✅ ·
`npm run test:responsive` (62 ✅) · build ✅ · deployed.

Open: tier-2 dossier review (Keenan Allen, Miles Sanders, Deshaun Watson), the
ROBBERY badge is untested, the Yahoo 2025 export, and `fixtures/league-teams.json`
still leaks real names — it predates `fixtures/raw/` and the sanitizer never
regenerates it.

## Session 8 — 2026-09-11 (live scoring, and the data Studs & Duds was missing)

**`totalPoints` is zero until ESPN closes the scoring period.** This is the
single most valuable thing in this file. Verified mid-week-1 with two NFL games
already final: every team read `totalPoints: 0.0` while `totalPointsLive`
carried the real score. We had been reading `totalPoints`, so the scoreboard sat
at 0-0 for two days with real points on the board.

**One wrong field broke two features.** A matchup only reaches LIVE when it has
points, so it never did, so the adaptive cadence never escalated — it routine-
synced every 15 minutes straight through a live slate. Two symptoms, one cause,
and the second was invisible until the first was fixed.

**Then fixing it exposed the cadence's real bug.** Its live signal was
`status = 'LIVE'`, and a fantasy matchup is LIVE from Thursday kickoff to Monday
night. That would have polled every minute for four days. It now keys off
`matchups.score_changed_at`, written only when a score actually moves — which
needs no game-window guesses and therefore also covers the Saturday slates the
windows deliberately omit.

**`player_week_scores` had zero rows all season** because nothing ever wrote it.
`syncLeague` covered settings, teams, matchups and transactions; there was no
roster ingest at all. That, not the award engine, is why Studs & Duds was mostly
placeholders. `syncRosters` now fills it — and needs BOTH `mMatchupScore` and
`mBoxscore` on one request, because the first omits `eligibleSlots` and the
second zeroes the team totals.

**The lesson, again:** the bug was not in any code that looked wrong. Every
function did exactly what it said. Finding it took reading the actual ESPN
payload next to the actual database rows next to the actual page. The repo has
now been bitten three times by a silent wrong-but-plausible value — swallowed
upsert errors, an empty migration, and now a zeroed field — and each time the
tell was a number that was suspiciously round.

**Verification:** `npm test` (231 ✅, 15 files) · `npx tsc --noEmit` ✅ ·
`npm run test:responsive` (62 ✅) · build ✅ · deployed and confirmed against
production: six LIVE matchups with real scores, 187 player rows, Brock Purdy
holding both The Prime Specimen and Fantasy Nostradamus.

**Late in the session James reversed the awards timing.** Studs & Duds now
publishes ONCE, Tuesday morning, from the `awards` table — not computed per
request. An award that recomputes can change under whoever is looking at it, and
that matters more than having something on the page by Sunday teatime. The page
opens on the latest published week; an unpublished week says so rather than
showing numbers that will move. Release timing is a condition the two-minute
sync evaluates (`lib/awards/release.ts`), never its own cron entry — a lost tick
must cost minutes, not a week.

**The Waiver Wire Wizard and The Galaxy Brain are wired up too.** James asked
whether they actually were; they were not. Building them meant stopping the
parser from discarding ESPN's lineup-change transactions — a start/sit swap is a
`ROSTER` row with `LINEUP` items, stored now as type `LINEUP`, counted by the
award, and still hidden from the transaction log where it would be noise. One
row per decision, not per player: ESPN sends a swap as one row with two items.

**The lineup optimizer is built, so all twelve awards are real.** James thought
we only had to wait for the week to end; in fact `eligibleSlots` was parsed and
then discarded (never stored), and there was no solver. It is maximum-weight
bipartite matching — greedy is wrong in a superflex league, where OP competes
with QB for the same players — cross-checked against an independent bitmask DP
over 500 random rosters. Watch for two traps recorded in DECISIONS: the
Hungarian formulation hangs when seats outnumber players (fixed with empty-seat
columns), and a missing stat line means ZERO here and null everywhere else.

Open: tier-2 dossier review, the ROBBERY badge, the Yahoo 2025 export, and
`fixtures/league-teams.json` still leaks real names.

## Session 9 — 2026-09-15 (the Weekly Recap, and its author)

**Week 1's recap is live at `/recaps/week-1-the-scoring-record-fell`,** bylined
by **Dr. Bunsen Burner** — a fictional mad-scientist sportscaster whose voice,
process and boundaries live in `.claude/skills/fantasy-weekly-recap/`. 1,880 words, an
8.5-minute read, inside the 7–10 minutes James asked for. `/recaps` and
`/awards` are both now `ready: true` in the nav with a NEW badge; neither is
URL-only any more.

**The skill is the deliverable, not the one recap.** `scripts/gather.ts` dumps
everything a recap needs from the database in one read-only pass — matchups,
the published awards, top starters, busts against projection, bench scores over
15, roster moves. `references/voice.md` is the craft spec, `image-prompt.md`
the art direction, `data.md` explains what each section of the dump is for.
Run `check-pronouns.ts <week>` before publishing; it is a review aid rather
than a gate, and DECISIONS says why.

**Two rules the recap cannot break:** every NFL fact goes through a web search
first (training data is behind the season), and no NFL beat ships unless it
lands on somebody's roster in this league.

Three things worth knowing next time. Higgsfield's `generate_image` needs its
arguments nested inside `params`, and `soul_cinematic` rejects `quality:
"1080p"` — only `1.5k` or `2k`. Caricatured players render as claymation
clowns; rim-lit silhouettes work every time. And the responsive suite's recap
sample used to be pinned to week 0 — the one recap with no cover and no byline
— so it passed while the new cover and byline went untested; it now derives
from `publishedRecaps()[0]`.

**A layout bug got through every responsive assertion:** at a fixed 64px the
cover's "Week 1" wrapped at 375px and landed on the ghost numeral. Nothing
overflowed, so nothing failed. Not every layout failure is an overflow — look
at the page.

## Session 10 — 2026-09-22 (week 2)

**Week 2 recap published** at `/recaps/week-2-the-bill-arrives`, 2,061 words.
Awards for week 2 had already generated on their own (24 of them, Tuesday
release window) and the record book recomputes at render time, so the only
hand-written artefact was the recap. That is the pipeline working as designed —
confirm before assuming there is work to do.

**Two injuries drove the week's worst fantasy lines** and neither is roastable:
Jaxson Dart (sprained MCL, opening drive, Mike's OP slot, 0.8) and Malik Nabers
(shoulder, Doug's flex, 0.6). Reported flat, with the recap saying on the page
that it would not be made funny. Mike's 55.4 was roasted only on the parts that
were not injury — a 9.0 quarterback, a 2.0 kicker, a minus-one defence.

**Five of my own numbers were wrong in the first draft** and the gather/awards
data caught all five: Bree's 144.4 is the 2nd-best score of the week not the
4th, it beat 5 of 6 winning scores not 4, Colin's 81.4 is 3rd-lowest not 2nd,
only 2 of the 3 benched-star managers lost, and James had not won back-to-back
Cat Burglars. **Check every comparative claim against the data, not against the
shape of the sentence.** "Carted off" also got written about Dart, who was not
carted off — invented detail, caught on review.

**Open bug, task spawned:** `/standings` shows ESPN's seed with our engine's
movement arrow, so Doug renders as "rank 6, down 6" while Free Fallin' says he
went 3 → 9. Two pages, two ranks, same week. The recap deliberately avoids
naming Doug's rank.

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

## 2026-08-28 · Framework preset pinned in vercel.json, not the dashboard
**Why:** The Vercel project was created by importing the repo while it was
EMPTY, so detection found nothing and set Framework Preset = "Other". That
preset runs `npm run build` (so build logs look perfectly healthy, route `ƒ /`
and all) but then serves the static `public/` directory and ignores `.next`
entirely — every route 404s with `x-vercel-error: NOT_FOUND`.
**How:** `vercel.json` with `"framework": "nextjs"`. In-repo and reviewable, so
it cannot silently drift the way a dashboard setting can, and a future re-import
gets it right automatically.
**Lesson:** a green build log is not evidence the site works. Verify the
deployed URL.

## 2026-08-28 · Design system: "Field Lab"
**Why:** James supplied four references — FantasyPros (layout), Guillotine Leagues
(dark, aggressive), Fantasy Life (light, dense), Creator Science (brand DNA) — and
asked for a blend rather than a copy.
**Concept:** "A sports broadcast graphics package, operated by scientists." The
league is a Creator Science community called The Lab Rats, so the lab motif is what
fuses science and football into one language instead of two.
**Taken:** FantasyPros' persistent dark rail; Guillotine's condensed uppercase
display voice; Fantasy Life's tag/avatar density; Creator Science's electric blue,
whitespace, and circular seal (recast as laboratory glassware).
**Key choices:** the rail stays dark in both themes because it is chrome, not
content. Structure comes from hairlines, never shadows. Signal colors are reserved
for state and always paired with a text label. The monospace "eyebrow" is the
device doing the most work — it makes football data read as measured data.
**Living guide:** `/style` route renders from real tokens, so it cannot drift from
the app. A static-only style guide would.

## 2026-08-28 · Header motif: football field, not graph paper
**Why:** James liked the graph-paper texture but wanted it football-relevant. The
lab motif is already carried by the seal, the eyebrows, and the voice — the header
texture was free to say "football" instead of repeating "science."
**How:** `.field-lines` — 5-yard lines, heavier 10-yard lines, and two rows of
one-yard hash marks at the real field's inbound positions.
**Tuning:** first attempt used 9px hash ticks at 11.2px spacing, which merged into
two dashed rules. Shortened to 6px and raised 10-yard contrast so the rhythm reads.

## 2026-08-28 · Scoreboard drew from Yahoo and ESPN, kept our own frame
**Why:** James supplied Yahoo and ESPN fantasy scoreboard screenshots as reference.
**Taken:** ESPN's team logos (already in `season_teams.logo_url` — all 12 present),
Yahoo's record-under-team-name and projected-under-score, and Yahoo's card header
with week identity left and state right ("Not started yet").
**Not taken:** ESPN's two-column card grid. Our single-column list with condensed
display type carries the broadcast voice better, and with the supporting sections
removed the scoreboard is the page — a list reads stronger than a grid there.
**Records are derived,** not stored: computed from FINAL matchups on read.
`standings_snapshots` is the right home once the standings engine exists, and
storing them now would create two sources of truth that can disagree.

## 2026-08-28 · Homepage reduced to header, draft countdown, scoreboard
**Why:** James removed League Parameters, Roster Construction, and Record Books
from the homepage. Those facts belong on their own sections, not the scoreboard.
**Effect:** the scoreboard is now unambiguously the page, which is what §4 asks for
— the fantasy league is the product, not a dashboard about it.
**Copy:** "12 Contenders · 1 Champion" replaces the neutral team/week count. It
states the stakes rather than the configuration.

## 2026-08-28 · Member photos replace ESPN team logos
**Why:** James supplied a photo per league member. A real face makes the
scoreboard read as this league rather than any league.
**Where:** `franchises.photo_url` — editorial data (§13) on the persistent person,
not on a season's team, so it survives renames and never gets written by a sync.
Verified: after a full re-sync all 12 photo_url values were still intact.
**Processing:** 5.9MB of originals -> 223KB of 256px squares in `public/members`.
Serving a 1MB PNG for a 36px avatar would be indefensible.
**Matching:** `npm run seed:photos` matches on a name slug and exits non-zero on
any unmatched franchise OR orphan file, suggesting the closest filename. Written
that way because a near-miss spelling looks fine until someone notices one avatar
is a fallback — and I had in fact misread one filename by eye beforehand.

## 2026-08-28 · Scoreboard defaults to the live week
**Why:** Hardcoding week 1 means the page is wrong from September onward.
**How:** `seasons.current_matchup_period`, written each sync from ESPN
`mStatus.currentMatchupPeriod`. `?week=` still overrides for browsing, and the
current week is badged CURRENT so it is obvious when you have navigated away.

## 2026-08-28 · Countdown shows seconds
**Why:** James noted that stopping at minutes makes it look frozen. Seconds are
the whole reason to put a live timer on the page.
**Cost:** a 1s interval instead of 30s. The timer carries `aria-live="off"` — a
per-second assertive region would make screen readers unusable.

## 2026-08-28 · Playoff Picture shipped as a real route, not a dead link
**Why:** James wanted a Playoff Picture shortcut on the scoreboard. Linking to a
route that does not exist would have reintroduced exactly the 404 problem fixed
one commit earlier.
**How:** `/playoffs` is a real page with an honest empty state (§38), not a
placeholder. Before any game is final there is genuinely nothing to seed, so
"Nothing to seed yet" is correct behavior rather than a stub — and it still
surfaces real information: berths, byes, seeding rule, and when the regular
season ends.
**Bracket icon:** drawn by hand in `primitives.tsx` to mirror ESPN's mark (two
seeds left, joined into one right). Lucide has no close equivalent and
approximating with a merge or network glyph read as the wrong concept.

## 2026-08-28 · Logo background removed by flood fill, not by AI generation
**Why not regenerate:** James asked whether an image model could produce a
transparent version. It could produce *a* logo, but not *this* logo — a
different rat, different lettering, different shield. That is a new brand asset,
not a transparent copy of an existing one. For a brand mark, fidelity is the
entire requirement.
**Why not an ML background remover:** those are built for photographic subjects.
On hard vector edges they feather the outline and tend to mangle thin shapes —
here, the rat's tail and whiskers. And the naive alternative, keying out every
white pixel, would punch holes through the artwork's own white: the "LAB RATS"
lettering, the lab coat, the shield outline.
**What we do instead:** `scripts/make-logo-transparent.py` flood-fills inward
from the image border and clears only white *connected to the outside*, so
interior white survives. Boundary alpha is feathered by brightness, since edge
pixels are anti-aliased against the old background and a hard cutoff leaves a
crunchy rim. Deterministic, exact, and free.
**Fallback:** `AppShell` checks on disk for the generated file and passes it to
the rail, so the seal-and-wordmark fallback shows until the logo exists — no
broken image, and no code change needed when it lands.

## 2026-08-28 · Logo sources committed; member photo sources not
**Logos** are brand masters with no personal data, and James is not keeping his
own copies — 2.3MB is a fine price for not losing them. **Member photos** stay
gitignored: the repo is public, the optimized 256px versions are already
published on the site, and full-resolution photographs of twelve real people add
exposure without adding capability.

## 2026-08-28 · Live preview mode (?preview=live)
**Why:** James wanted to see the scoreboard populated before any game exists —
which is exactly what §16 asks demo fixtures to provide.
**Two rules that make it safe:** it never touches the database (rows are
decorated on the way to the view), and it is deterministic, seeded from matchup
id and week, so the page does not reshuffle every render and screenshots are
reproducible.
**Always banner it.** Simulated data that looks real is worse than no data. The
banner is unmissable, the draft countdown hides (preseason furniture), and
preview persists across week navigation so you can browse in it.
**Shape:** two games final, three live, one scheduled — a believable mid-Sunday,
chosen because it exercises every visual state at once.

## 2026-08-28 · Reigning champion wears a crown
**Why:** James wanted the defending champion marked wherever she appears.
**Where:** on `TeamAvatar` in `primitives.tsx`, not in the scoreboard. Every
future surface — standings, awards, record books — picks it up for free rather
than reimplementing it.
**Source of truth:** the editorial `champions` table, most recent year. Not
inferred, because seasons predating the app have no ESPN data to infer from.
**Accessibility:** the crown carries `role="img"` and a label naming the year, so
it is not a color-only signal (§39).
**Amber, per the palette:** `--warn` is already defined as "provisional,
championships". No new color was introduced.

## 2026-08-28 · Metadata split rather than one long title
**Why:** James asked for the title and description to be "The Lab Rats – A
just-for-fun fantasy football league brought to you by Creator Science."
**How:** title `The Lab Rats`, description the rest. A full sentence in a browser
tab truncates to nonsense; search results and link previews render the two
together as the intended string. A title template gives subpages
"Playoff Picture · The Lab Rats". OpenGraph and Twitter cards use the badge.

## 2026-08-28 · Gold is its own token, not a brighter amber
**Why:** The crown initially used `--warn`, whose light-mode value (#a86500) is
brown enough to read as bronze. Brightening `--warn` was the wrong fix — it means
"provisional" and has to stay muted so it never competes with real results.
**How:** a separate `--gold-hi / --gold / --gold-lo / --gold-ink` set, applied as
a three-stop gradient. A flat fill reads as a yellow dot; the gradient is what
makes it read as metal.

## 2026-08-28 · Scores render in every state, including 0.0 pregame
**Why:** James could not see the score layout because scores only rendered for
LIVE and FINAL matchups.
**Also correct on the merits:** both Yahoo and ESPN show 0.00 before kickoff. An
empty score column reads as broken rather than as pregame, and it hides the
column widths that the layout depends on.

## 2026-08-28 · Standings computed from results, not stored snapshots
**Why:** Movement needs last week's ranking. Storing snapshots would work, but
only for weeks we happened to capture — and nothing writes `standings_snapshots`
yet, so historical movement would have been permanently unavailable.
**How:** `computeStandings(results, teams, throughWeek)` is pure and re-runnable,
so "where did this team sit in week 4" is answerable at any time. Movement is
just `computeStandings(week N-1)` compared against `computeStandings(week N)`.
`standings_snapshots` remains the right home for expensive derived metrics
(all-play, expected wins) once those engines exist.
**Tested:** 14 cases covering ties as half a win, non-final games excluded, the
points-for tiebreak, streak counting only the current run, and movement netting
to zero across the table — every climb is someone else's slide.

## 2026-08-28 · Standings sort is record then points-for, and is NOT confirmed
ESPN reports `playoffSeedingRule: H2H_RECORD` but does not expose the tiebreak
chain below record. Points-for is ESPN's usual next tiebreaker and is what the
engine applies, documented in `compute.ts`. Per §29 this stays unverified until
James confirms it against the league settings, and any playoff seeding derived
from it should be labelled unofficial until then.

## 2026-08-28 · Columns dropped: Waiver and Moves
James's call. Waiver priority belongs on the Transaction Log where the moves it
governs actually live, not in a standings table.

## 2026-08-28 · Tiebreaker CONFIRMED: head-to-head record
James confirmed the league's seeding tiebreaker is head-to-head. The engine now
applies it before points-for, and the earlier "unverified" caveat is resolved.
**Three-plus-way ties** use a mini round-robin — each tied team scored only on
its record against the others in the tie. That is why tiebreaking cannot be a
simple comparator: a team's tiebreak value depends on which teams it is tied
WITH, so tied blocks are resolved as groups.
**Points-for** still breaks what head-to-head cannot (teams that never met, or
an even split). Every row carries a `tiebreakNote` explaining why it sits where
it does (§21.6).

## 2026-08-28 · Clinching is conservative, except when it can be exact
A team is marked CLINCHED only if it cannot miss even losing out while every
rival wins out. That can lag a full elimination analysis by a week — rivals who
play each other cannot all win out, which a rigorous answer would exploit via
the max-flow argument used for baseball elimination. Being late is acceptable;
claiming a berth that is not certain is not (§66).
**One exact case:** with zero games remaining the table IS the result, so rank
alone decides. Without that carve-out, teams tied on wins at season's end showed
as unresolved — 5 of 6 berths clinched in a finished season, which is wrong.

## 2026-08-28 · Field geometry is proportional, not pixel-based
Yard lines and hash marks are sized in percentages (5%, 10%, 1%) so exactly one
100-yard field spans the header at any width, and the nine yard numbers at 10%
intervals land on the 10-yard lines. The previous fixed-pixel spacing tiled a
partial second field, producing a tenth number and a duplicate 10.

## 2026-08-28 · Playoff bracket is configuration-driven
Nothing in `buildBracket` knows this league has six teams or two byes — both
fall out of `playoffTeamCount` (§21.3, "do not hardcode six playoff teams").
The field is padded to the next power of two and the difference becomes byes for
the top seeds. Tested against 4, 5, 6 and 8-team fields.
**Pairing is a FIXED bracket, not reseeded.** ESPN's default for six teams is
3v6 / 4v5, then #1 plays the 4/5 winner. A reseeding league would give #1 the
lowest surviving seed instead. Flagged on the page and in the code; confirm
before the playoffs open.
**Unknown participants carry a placeholder** ("Winner 3 vs 6") rather than
rendering blank, so the bracket reads as a bracket before anything is decided.

## 2026-08-28 · Transaction parsing verified only for internal consistency
This league had ZERO transactions when the real payload was captured, so
`mTransactions2`'s populated shape has never been observed here. The parser is
written from documented behavior and tested against
`fixtures/hypothesised/mTransactions2-populated.json` — a hand-authored file,
clearly named and commented as hypothesised, NOT a capture.
**This is the §60 boundary:** the parser exists and is defensive, but it is not
verified. Capture a real payload after the first transactions occur and re-run
the tests before trusting the log.
**Ingestion is wired anyway** so day-one moves are captured rather than missed.
It is idempotent, and if the shape is wrong the sync fails cleanly (§31) without
corrupting existing data.
**Known gap:** player NAMES are not available from `mTransactions2` — it carries
ids only. Resolving them needs a player sync from the roster views, which cannot
be built until rosters exist after the Sept 3 draft. Until then the log reads
from preview data.

## 2026-08-28 · og:image is a composite, not a bare logo
**Why:** the square badge rendered as a small thumbnail card. Link previews are
built for 1200x630, which every major platform crops toward.
**How:** `scripts/make-og-image.py` composites the landscape lockup over an
AI-generated nighttime stadium photograph. The background is cover-cropped
rather than squashed, then given an overall scrim and a centre vignette — white
logo lettering was otherwise competing with stadium floodlights depending on
where the crop landed.
**JPEG, not PNG.** As PNG the card was 938KB for a photograph; JPEG at q88 is
112KB and visually identical. A link preview that loads slowly often does not
render at all.
**twitter:card** raised from `summary` to `summary_large_image` to match.
**Source image** (7.5MB) is gitignored; only the 112KB composite ships.

## 2026-08-28 · Browser tabs show only the title
James expected the meta description beside the favicon. Tabs render the
`<title>` and nothing else — descriptions appear in search results and link
previews. The title stays short deliberately: Chrome truncates hard once
several tabs are open, so a full sentence would read as "The Lab Rats — A
just-for-f…".

## 2026-08-28 · Bracket pairing CONFIRMED: fixed, no reseeding
James confirmed the league uses a fixed bracket. Seeds do not shuffle between
rounds, so #1 plays the 4/5 winner and #2 plays the 3/6 winner regardless of who
survives. This is what `buildBracket` already did; the caveat comments in
`bracket.ts` and `compute.ts` are now statements of fact rather than assumptions.

## 2026-08-28 · Tiebreak notes are typed, so the UI can hide the redundant one
Rows carry `tiebreakKind` alongside the note. Points-for notes are suppressed in
the UI because points for is already its own column — only head-to-head adds
information that is not otherwise on screen. Typing it beats matching on the
note's text, which would break the moment the wording changed.

## 2026-08-28 · Outside Looking In shows only teams outside the cut
The playoff page's lower section lists ranks 7-12 only. The blue cut line and
the clinch lock were removed from it along with their legend: neither symbol can
appear among teams already outside the field, and a legend for symbols that are
never present is noise. Both remain on the standings table, where the full
field is listed and both do appear.

## 2026-08-28 · Weekly recaps ship as a page, not email
James's call after weighing it: the league already lives in a group chat, so a
link posted there gets read more reliably than an inbox does. That removes the
Resend dependency, the subscriber list, unsubscribe tokens and CAN-SPAM
handling entirely — and keeps the web version canonical rather than a fallback
for when email HTML breaks.
**Dependency unchanged:** a recap is only as good as the facts beneath it, and
those come from the Studs & Duds awards engine (§54: analytics produces
structured facts, the writing layer only phrases them). Build awards first, then
recaps compose facts that already exist instead of growing a parallel copy.

## 2026-08-28 · The playoff cut is a labelled row, not a border
Previously a 2px bottom border on the sixth team, which read as a divider
without saying what it divided. It is now its own table row carrying
"PROJECTED PLAYOFF CUT" between rules — the projected-cut treatment from a golf
leaderboard.
**Rendered as a real `<tr>`,** not a pseudo-element, so a screen reader
announces it between the sixth and seventh team where it carries meaning.
**Suppressed when nothing sits below it** — a cut line at the bottom of the
table divides nothing.
**Legend entry removed:** the line now names itself, and a legend explaining a
labelled element is noise.

## 2026-08-28 · Player pool is NOT blocked by the draft
`kona_player_info` returns ~1,027 players with names, positions, pro teams and
eligible slots BEFORE the draft, given an `x-fantasy-filter` header. I had this
filed as blocked until rosters existed, which was wrong — it blocked the
transaction log's player names for no reason.
**Lesson:** "blocked" should be tested, not assumed. This one cost a week of the
Transaction Log looking less finished than it needed to.

## 2026-08-28 · SUPERFLEX CONFIRMED
The player pool's `eligibleSlots` settles the long-standing open question:
slot 7 (OP) accepts QB/RB/WR/TE; slot 23 (FLEX) accepts only RB/WR/TE.
**This is a superflex league.** The lineup optimizer was blocked on this fact.
It also changes positional value — a second startable QB outranks a third WR,
which should inform award weighting when Stud of the Week is built.

## 2026-08-28 · Snapshots ship before the features that consume them
ESPN exposes only the current state; it has no memory of a past score. Any week
that passes without snapshot capture is unrecoverable. So `captureSnapshots`
shipped ahead of comeback/blown-lead/win-probability features that will not
exist for months — the alternative is those features launching with no history
to draw on.
**Thresholds:** 3-point move or 10-minute checkpoint for matchups; once per week,
only when every game in it is final, for standings. Continuous capture would be
~600 rows per matchup per Sunday for no added insight (§14.7).

## 2026-08-28 · Biggest remaining gap is live auto-refresh
The scoreboard is labelled live and the data behind it now refreshes every
minute during games, but the page does not update without a manual reload. That
is the largest gap between what the app is and what it appears to promise on a
Sunday. Needs Supabase Realtime or a 30s refetch (§36) before week 1.

## 2026-08-28 · Auto-refresh via router.refresh(), not Supabase Realtime
Realtime would be more elegant, but it needs a table publication, a WebSocket
per viewer and reconnection handling — for data that changes at most once a
minute, for twelve people. `router.refresh()` polls our own server (never ESPN,
so viewer count costs ESPN nothing) and re-renders in place, so scores update
without the scoreboard blanking (§37). Spec §36 allows this as the MVP.
**Only runs when something can change:** current week, not preview, and at least
one matchup live or scheduled. Pauses on a hidden tab and catches up on return.

## 2026-08-28 · Projected playoff mode is not needed
James: he wants a moment-in-time snapshot of who is in and out, which is what
the page already does. §21.1's PROJECTED mode is dropped from scope rather than
built and left unused.

## 2026-08-28 · 2025 history is editorial and partly unlinkable
The 2025 season was played on Yahoo, so no ESPN payload exists — now or ever.
Seeded by hand into `champions` + `season_podium`.
**`season_podium.franchise_id` is nullable on purpose:** Avery Smith finished
second in 2025 but is not in the 2026 ESPN league, so there is no franchise row
to point at. Recording the name anyway beats dropping a real result because the
person left. The seed script reports which entries linked and which did not.
**Firsts and Worsts** therefore starts empty: there is no game-level 2025 data to
import, only final standings. James regains Yahoo history access on Sept 15.

## 2026-08-28 · Admin is at /admin, unlisted, shared-secret only
No user accounts exist, so the same CRON_SECRET is the whole auth model. The key
is posted as a form field rather than a query string so it never lands in
browser history, access logs or a Referer header. Page is noindex.

## 2026-08-28 · Award catalog declares its data dependencies
All 20 awards live in `src/lib/awards/catalog.ts` with a documented formula
(§22.8) and an explicit `needs` list: FINAL_SCORES, PLAYER_SCORES, PROJECTIONS,
LINEUP_OPTIMIZER, TRANSACTIONS, LIVE_EVENTS. Seven satisfy today; thirteen do
not.
**Why declare rather than omit:** an award that is simply absent looks like an
oversight. One that says what it is waiting on is a plan. It also means the page
needs no change as data arrives — `buildAwardCards` prefers real computation and
falls back to a placeholder, so each award converts on its own the moment its
dependency lands.

## 2026-08-28 · Placeholder awards are marked, seeded, and drawn from real players
Thirteen cards show representative values so the layout can be judged before
week 1. Three rules keep that honest: nothing is written, values are
deterministic (seeded by award key and week, so screenshots reproduce and the
page does not reshuffle), and every placeholder carries a "Sample" marker whose
tooltip names the missing dependency.
Player names come from the real synced pool rather than "Player A", so the cards
show what an actual week will look like.
**Ranges are per-award:** a bench MVP and a win-probability collapse are not the
same kind of number, so each has its own plausible band rather than one generic
random score.

## 2026-08-28 · Award card hierarchy: the award name leads
The card originally set the award name as a small mono eyebrow and the
recipient in display type — inverted, since the award name is what people scan
for. The name is now display 21px at the top of the card; the recipient drops to
15px beneath it.
**The metric keeps its size** but is set in the section accent, so name and
number read as different KINDS of information rather than competing for the same
rank. Two large elements do not fight when only one of them is coloured.
**Section headings take the normal text color.** Green and red on the headings
duplicated a distinction the cards' edge bars and metric colours already carry,
and coloured headings made the page read as an alert rather than a scoreboard.

## 2026-08-28 · Capture cadence is tracked per award
Each award now declares a `capture` cadence — FINAL_ONLY, WEEKLY_BOXSCORE,
PREGAME_PROJECTION or CONTINUOUS — alongside the fields it reads. Cadence is
what drives storage cost, and it is largely independent of which fields an award
needs.
**The answer that matters: 19 of 20 awards need at most TWO captures a week.**
Seven work off final team scores alone. Eight more need one boxscore pull after
Monday night. Four more need one projections pull before Thursday. Only Choke
Job — "largest drop from peak in-game win probability" — requires a continuous
record, because a peak that was never observed cannot be recovered.

## 2026-08-28 · Correction: Heartbreak Kid was mis-tagged
It was marked as needing LIVE_EVENTS. Its formula — "opposing player whose
points exceeded the final margin by the most" — reads only the final boxscore
and the final margin. Corrected to PLAYER_SCORES / WEEKLY_BOXSCORE. The
over-cautious tag would have made the continuous-capture case look twice as
strong as it is.

## 2026-08-28 · Award names are nouns; every card carries a one-line definition
James: "Manager Of The Week" is boring, "Fantasy Nostradamus" is fun; and
"Highway Robbery" names an act rather than a thing. Every award is now a noun
phrase naming a character or a scene — The Mastermind, The Cat Burglar, The
Prime Specimen, The Crime Scene, The Lead Balloon — with a plain one-sentence
definition beneath the title so nobody has to guess what earned it.
**Ordering** within each section: manager judgment, then matchup outcomes, then
individual performances, driven by a `category` field rather than array order.

## 2026-08-28 · Player headshots come from ESPN's image combiner
`a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{id}.png&w=..&h=..`
The raw asset is ~240KB; the combiner at display size is ~16KB.
**A fallback is mandatory, not optional:** a player with no photo returns a
404 with a 1-byte body, not a placeholder image. Rookies, practice-squad
call-ups and team defenses all miss, so the component swaps in initials onError.

## 2026-08-28 · Placeholder headlines must not repeat the card description
Adding the one-line definition under each title exposed a duplication: the
generic placeholder fallback used `def.blurb` as its headline, so seven cards
printed the same sentence twice. Each score-based award now has its own sample
headline, and the fallback explicitly never reuses the blurb.

## 2026-08-28 · Studs are manager awards; players are evidence, not recipients
James reworked the Studs list to six awards, all won by a MANAGER. Where a
player drives the result, the player renders beneath the manager as supporting
evidence rather than as the award's subject.
**New `evidence` field** ('PLAYER' | 'MATCHUP') is distinct from who receives an
award — it says what is shown as the reason. That separation is what lets a
manager win an award a player earned.
**Removed entirely:** The Photo Finish, The Track Meet, The Giant Killer, The
Lottery Ticket, One-Man Army. The Understudy became The Bench Bum, reframed
from the player to the manager who benched him.
**The Mastermind was redefined** from "highest score" to "most optimal lineup",
so it no longer maps to the engine's highest-score result — it now needs the
slot-aware optimizer. That drops the computable-today count for Studs from four
to one (The Cat Burglar).
PHOTO_FINISH and SHOOTOUT remain in the engine but are unmapped, pending the
Duds revision.

## 2026-08-28 · Awards finalised: six Studs, six Duds, all manager awards
Every one of the twelve is won by a MANAGER. Where a player or a matchup drives
the result, it renders beneath as evidence rather than as the recipient — the
`evidence` field decides which.
**Matchup awards belong to the manager it happened TO.** The Public Execution
goes to the team that was beaten, not the one that did the beating.
**Two awards are mirror images:** The Giant Killer (largest projected deficit
that still won) and The Choke Artist (largest projected advantage that still
lost) describe the same matchup from opposite sides. Both fall out of the same
pregame projection capture.
**The Mastermind and The Bench Bum are also inverses** — smallest and largest
gap to the optimal lineup — so one optimizer implementation serves both.
**Computable today: 4 of 12** (Cat Burglar, Dumpster Fire, Bad Beat, Public
Execution). The rest need the weekly boxscore, the pregame projection pull, or
real transactions.

## 2026-08-28 · Engine keys are catalog keys
`computeWeeklyAwards` now emits catalog keys directly instead of internal enum
values translated through a lookup table. The mapping layer had already drifted
once — MANAGER_OF_THE_WEEK still pointed at a highest-score computation after
The Mastermind was redefined as lineup optimality. A test now asserts in both
directions: every award marked computable is produced, and every award produced
exists in the catalog.

## 2026-08-28 · Award reveal: hover, tap AND keyboard — never hover alone
The frosted-glass reveal fires on pointer hover, on tap/click, and on keyboard
focus, plus a page-level "Reveal all" switch. Hover alone would have hidden
every award from touch and keyboard users entirely.
**Content is only blurred, never removed or `aria-hidden`.** Screen readers get
the whole card regardless — a visual effect must not become an accessibility
wall. The interactive layer is a real `<button>` so Enter and Space work and the
state is announced via `aria-expanded`.

## 2026-08-28 · Reveal written as hand-authored CSS, not Tailwind variants
The first attempt used `group-hover:blur-0`. **Tailwind v4 has no `blur-0`** —
only `blur-none` — so it generated no rule at all and the reveal silently never
worked. Nothing errored; the cards simply stayed frosted.
Rewritten as explicit rules in globals.css, which the CSS contract test can
assert. This is the second time a Tailwind class that does not exist has failed
silently; hand-authored CSS for effects is the safer default here.

## 2026-08-28 · The CSS contract test was itself too strict
Its regex required a class to be followed by `{` or `,`, which false-negatived
on compound selectors like `.reveal-card:hover`. Now matches the class as a
selector token. Re-verified against the real failure mode — deleting the whole
block — which correctly fails four assertions.

## 2026-08-28 · Commentary replaces the player and opponent chips
Award cards previously carried a player chip or an opponent chip beneath the
manager, which meant cards had different shapes depending on the award type.
Those details now live inside a single commentary sentence with the names and
numbers in bold, so every card has identical structure.
**One builder serves real and sample awards** (`commentary.ts`), so the voice
cannot diverge between what you see before week 1 and after it.
**Managers are referred to by first name** — that is how the league talks about
each other, and it reads far better than "Jesse Anderson lost to Mr. Anderson".
`PlayerHeadshot` is now unused on this page but kept: matchup expansion needs it
once player scoring exists.

## 2026-08-28 · Reveal prompt says the right verb for the device
The prompt is centred in the frosted area and reads "Hover to reveal" on
pointer devices, "Tap to reveal" on touch, swapped by
`@media (hover: hover) and (pointer: fine)`. Telling a phone user to hover is
an instruction they cannot follow.
The per-card "Sample" marker was removed at James's request. The page-level
banner still reports how many awards are showing representative values, so the
information is not lost — only the repetition.

## 2026-08-29 — Responsiveness is enforced by a suite, not by periodic audits

**Decision.** `npm run test:responsive` drives real Chromium over every route at
five widths (320 / 390 / 768 / 1024 / 1440) and fails the build on horizontal
overflow, elements outside the viewport, tap targets under the floor, or content
hidden behind the mobile bar.

**Why a browser.** Layout overflow cannot be detected without layout. JSDOM has
no layout engine, so a unit test literally cannot see this class of bug. That is
why it went unnoticed until it was looked at by eye.

**Why filesystem-driven routes.** A hand-maintained route list is a list someone
forgets. Walking `src/app` means a new page is covered the moment it exists —
verified with a canary page that was caught at all five widths with no test edit.
A dynamic segment with no sample fails the suite rather than being skipped;
a silently dropped route is exactly how a page escapes the net.

**What the audit found.** No horizontal overflow anywhere — the `min-w` +
`overflow-x-auto` discipline on tables and the bracket was already correct.
Eight controls sat under the 44px touch floor. The mobile bar had no
`env(safe-area-inset-bottom)`, and `viewportFit: 'cover'` was missing, without
which that inset is always zero.

**What eyes found that the suite could not.** The suite proves nothing is broken,
not that anything is good. Screenshots showed the scoreboard squeezing its
three-column broadcast layout into 390px, leaving ~77px per team — every name
truncated to "TYLER'S T…" and the record wrapping mid-token. The sides now stack
below `sm`. Keep taking screenshots; the suite is a floor, not a ceiling.

**Accepted.** Standings still scrolls horizontally at 320px — it needs 347px for
rank + team + W-L-T. Closing that gap means shrinking the manager avatars, which
James explicitly asked to make larger. The scroll is graceful and contract-
permitted; the avatars stay.

## 2026-09-01 — Draft-day roast engine

Full rationale in `DRAFT-DAY.md`. The decisions that will be questioned later:

**The board is ours, not ESPN's.** ESPN's generic SUPERFLEX rank assumes ESPN's
defaults; this league runs 6-point passing TDs and half-PPR. ESPN publishes
projections already scored by the league's own rules (verified by hand against
Josh Allen's appliedTotal), so the board is VOR from those. Median disagreement
with ESPN's generic board is 12 slots — Derrick Henry is ESPN #39 and #9 here.

**Reach = better players still available**, not rank-minus-pick. By round 9
every player ranked under 100 is gone, so rank-minus-pick calls every late pick
a massive reach.

**Kickers and defenses rank below all skill players** regardless of VOR. Raw VOR
put the best defense at #57, which is arithmetically true and useless.

**National ADP is the punchline, never the yardstick.** It does not price a
second starting QB, so it flags every correct superflex QB pick as a reach.

**Everyone gets roasted at least three times.** In a league of friends, being
ignored stings worse than being roasted. Also capped at eight.

**Structured tool output, not raw JSON.** Opus emits thinking blocks that count
against max_tokens; raw JSON truncated mid-array and cost whole batches.

**SOUL.md's roast boundary is now two tiers.** The old blanket rule was written
for managers and wrongly extended to NFL players. Managers: decisions only.
Players: the choice or the institution, never the people harmed.

**Roast pages are noindex.** The jokes name real players on a site carrying real
people's names. Shareable by link, invisible to search. Site description also
dropped "brought to you by Creator Science" at James's request.

## 2026-09-02 — Voice spec, and checks over instructions

**Two voice documents, not one.** `ROAST-WRITER.md` is the craft spec James
supplied; `ROAST-BIBLE.md` was cut back to only what that document cannot know —
the two-tier roast boundary, the superflex facts, the accuracy rules, and the
player-then-roster-then-numbers hierarchy. Duplicating craft guidance in both
would guarantee they drift apart.

**Anything mechanical is a check, not an instruction.** Five separate rules have
been written down clearly and then broken: invented injury status, British
spelling, the grade restated in prose, a gendered collective in a headline, and
the word cap. `validate.ts` enforces punctuation, length, the weak-AI-comedy
blacklist, gendered collectives, British spelling and status invention. A
failure drives one targeted rewrite; only invented facts fall back.

**Badges are assigned per manager, not per pick.** Per-pick scoring gave one
manager eleven badges and another none, and produced no positive badge at all
across six managers. Ranking a manager's own picks against each other guarantees
a spread on every page: three bad, three mildly bad, one good, minimum five.

**Superlatives dropped**, James's call. The draft roaster, recap and report
cards are the feature set.

## 2026-09-06 — Mirror ESPN where ESPN is the answer

**The standings and playoff pages were never hardcoded.** James read them as
sample data, and at 0-0 across twelve teams that is a fair reading — but both
compute from ingested matchups and always have. The real gap was the opposite
problem: ESPN publishes things we were discarding.

**ESPN's seeds order the standings; our arithmetic is the cross-check.** ESPN
owns the tiebreaker rulebook, and spec §20.5 already demands the two match. So
where ESPN has published seeds, they decide. Two guards: preseason ESPN fills
`playoffSeed` with reverse draft order, and a partial or duplicated seed set is
ignored outright rather than used to half-reorder the table.

**We still compute the record ourselves.** It is deterministic, unit-tested, and
the only source of streak, movement and tiebreak notes. When ours and ESPN's
disagree the page names the teams instead of quietly picking a side — both sides
derive from the same games, so a disagreement means one of us is wrong.

**Playoff odds are mirrored, never modelled.** ESPN runs a Monte Carlo
simulation over the remaining schedule. Building our own would put a guess on a
page where everything else is arithmetic over games that happened. The odds get
their own section labelled as ESPN's projection, and nothing depends on them.

**`UNKNOWN` is not `false`.** ESPN's `playoffClinchType` reads `UNKNOWN` until it
decides. Rendering that as "not clinched" would be inventing a fact; the code
falls back to our own inference instead.

**The championship is two weeks.** ESPN reports
`playoffMatchupPeriodLengthByRound` as `{1:1, 2:1, 3:2}`. The bracket assumed one
week per round and printed the final on week 16 when it ends in 17. The map is
read now; nothing is hardcoded to three rounds.

## 2026-09-06 — Injured reserve is a transaction, not a drop

ESPN has no IR transaction type. An IR move is a `ROSTER` row whose item carries
an ordinary `ADD` or `DROP` action, distinguishable only by `fromLineupSlotId` /
`toLineupSlotId` crossing slot 21. The log was reading those at face value and
printing "Dropped" for a player still on the roster.

IR moves are now `IR_PLACE` / `IR_ACTIVATE`, read "To IR" and "From IR", carry
their own filter, and stay out of Players Added / Players Dropped. All other
`ROSTER` rows are still ignored — they are ordinary lineup shuffles.

**Every transaction kind gets its own colour**, added at James's request: trade
blue, free agent green, waiver amber, drop red, IR violet. IR needed a new
`--violet` token rather than reusing warn's amber — an injury designation
sitting in the same colour as a waiver claim was the exact confusion worth
avoiding. Per §39 the badge always names the kind; colour never carries it alone.

**A swallowed error hid a real trade for two days.** The transaction upsert
destructured only `data` and ignored `error`, so a failing write reported
SUCCESS on every sync. Every ingest write now throws on error and verifies the
row count it wrote. This is the second time a silent failure has cost a day —
the first was an empty migration file that `db push` recorded as applied.

## 2026-09-11 — The live score is not in the field called `totalPoints`

Three failures wearing one symptom: the scoreboard sat at 0-0 through a live
slate, and Studs & Duds had nothing to compute from.

**`totalPoints` is zero until ESPN closes the scoring period.** Verified
mid-week-1 with two NFL games already final: all twelve teams read 0.0 while
`totalPointsLive` carried the real number. Three ESPN fields hold the same
figure and every view fills a different subset, so the parser now takes
whichever is populated. `appliedStatTotal` is verified equal to the sum of a
team's starters, so the scoreboard total and the boxscore beneath it cannot
disagree. Full field-by-view table in `ESPN-API.md`.

**Fixing that exposed the cadence's real bug.** Its live signal was
`status = 'LIVE'`, which had been dead code while scores were stuck at zero and
became far too generous once they were not: a fantasy matchup is open
continuously from the Thursday kickoff to the Monday night whistle. Live cadence
would have run for four days — roughly 5,700 requests to watch nothing happen on
a Friday afternoon.

**A moving score is the honest signal.** `matchups.score_changed_at` is written
only when a score actually differs from the stored one, never on every sync, or
it would just be a slower copy of `last_synced_at`. It needs no game-window
guesses, so it covers the Saturday and holiday slates the windows deliberately
omit, and it stops on its own when the last game ends. The windows remain as the
cold-start case: at kickoff nothing has moved yet, so the clock opens the door.

**`player_week_scores` was never written by anything.** Not a bug in the sync so
much as a missing half of it — `syncLeague` covered settings, teams, matchups
and transactions, and no code path ever touched the table. Studs & Duds was
short seven awards because the data did not exist, not because the engine
could not compute them.

**Player awards land during the week, matchup awards wait for it to finish.**
The best performance of a Sunday is knowable on Sunday. Holding every card until
the week finalizes would leave the page empty during the only window anyone is
looking at it. "Lowest winning score", by contrast, is meaningless while games
are still being played.

**Only STARTED players win The Prime Specimen.** A 44-point week from someone's
bench is a Bench Bum story. The award is for the manager's decision, and leaving
him on the bench was the opposite decision.

**Still deliberately unbuilt:** The Mastermind and The Bench Bum need a
slot-aware lineup optimizer. It is a constrained assignment problem, not a sort,
and greedy bench substitution is wrong in a superflex league where the OP slot
competes with QB for the same players. `eligibleSlots` is now parsed and
available for it. The two transaction-driven awards need a join from
transactions to that week's scoring.

**The leak checker treated NFL players as league members.** It harvested every
`firstName` / `lastName` in a raw capture as an identifier, so the first
boxscore capture added 400 public figures to the secret list and flagged 318
false positives across fixtures that name players on purpose. Player subtrees
are now excluded.

## 2026-09-11 — Studs & Duds publishes once, Tuesday morning

James's call, hours after the awards first went live: generate once at the end
of the week rather than computing on every request.

**The reason it matters more than it sounds.** A recomputed award can change.
The Prime Specimen named after the early Sunday games loses the title to the 4pm
slate; whoever screenshotted it at 2pm is holding something the site no longer
agrees with. An award that shifts under you is worse than one that arrives a day
late. Studs & Duds is a week in review, and now it reads like one.

**This reverses a decision made earlier the same day.** The first cut had player
awards landing mid-week on the argument that the best performance of a Sunday is
knowable on Sunday, and that holding every card until Monday leaves the page
empty during the window people actually visit. That argument was about
engagement; James's is about trust, and trust wins. The engine still decides
player awards without a final matchup — preview mode needs it — but nothing
reaches the league until the week is settled.

**Timing is a condition, not a cron entry.** The same reasoning as
`lib/sync/cadence.ts`: a job pinned to "Tuesday 06:00" fires once, and a tick
lost to a deploy costs the week its awards with nothing to say so. The release
window opens Tuesday 06:00 ET and stays open through Saturday, evaluated by the
two-minute sync. Sunday and Monday are closed, because a week can look finished
at Sunday teatime with Monday night still to come.

**A week qualifies only when EVERY matchup in it is final**, not when any is.
The looser test would release a week mid-slate, which is the exact failure this
whole change exists to prevent.

**Only real awards are written.** Placeholders stay a render-time decoration.
Persisting invented values is how sample data stops being distinguishable from
the real thing, and the entire placeholder design rests on it never being
written to the database.

**The page opens on the latest PUBLISHED week, not the live one.** Defaulting to
the current week would show an empty page for the five days between Tuesday and
the following Monday — most of the time anyone is looking.

## 2026-09-11 — The Waiver Wire Wizard and The Galaxy Brain are real now

James asked directly whether either was actually wired up. They were not — both
were placeholders, and the "Jesse picked up Jared Goff and he went off for 72.0
pts" on the page was invented sample data seeded from the award key. Both are
now computed from stored transactions.

**ESPN logs lineup changes, and we had been throwing them away.** A start/sit
swap arrives as a `ROSTER` transaction whose items are `LINEUP` moves between
slots. The parser dropped every non-IR ROSTER row, correctly, because a
transaction LOG full of bench moves is noise. But they are real roster
decisions, and The Galaxy Brain — "made the most roster moves and still lost" —
is a worse award without them: the manager who shuffled his lineup nine times is
exactly who the joke is about. They are now stored as type `LINEUP`, counted by
the award, and still excluded from the log.

**One transaction per decision, not one per player.** ESPN records a swap as a
single row carrying two items, the player in and the player out. Counting items
would have scored one substitution as two moves and handed the award to whoever
made the most substitutions rather than the most decisions.

**The scoring period is ESPN's, not ours.** Each transaction carries its own
`scoringPeriodId`, which is the league's real Wednesday-waivers-to-Monday-night
boundary. Defining our own window would have been guesswork that drifts from
what the league actually sees.

**The Waiver Wire Wizard credits the CLAIMING team**, not whoever holds the
player now — a pickup can be dropped again days later, and the claim is the
thing being judged. Trades are excluded: winning a trade is a different skill.

**It does not require that the pickup was started.** The catalog formula is
"grabbed the highest scoring free agent", and identifying him is the hard part.
The card reports whether he started instead of the engine silently deciding.
That is a real judgement call and worth revisiting if the league disagrees.

**Both omit rather than reach.** No pickups that week means no Wizard; a single
waiver claim is not a Galaxy Brain. Mocking somebody for managing their team
once is worse than showing nothing (§22.2).

**The hypothesised transaction fixture is retired.** That file carried a header
warning that the parser was verified for internal consistency only, because the
league had no transactions when it was written. It now runs against a real
capture: 211 transactions, including the seven lineup swaps and three cancelled
waivers that the hand-written fixture never had.

## 2026-09-11 — The lineup optimizer, and why greedy was never an option

James thought the data was all there and we only needed the week to finish. Half
right: `eligibleSlots` had been parsed since rosters were first ingested and
then thrown away — never stored — and the solver did not exist. Neither needed
the week to end, because the Tuesday release gate already does the waiting.

**It is an assignment problem, not a sort.** CLAUDE.md has said so since before
there was any code to be wrong. Walking the roster from highest score down and
dropping each player into the best open slot commits a player before it knows
what the next player needs, and nothing in it can walk that back. In a superflex
league the OP slot competes with QB for the same bodies, so the failure is not
theoretical — it is the ordinary case.

Solved exactly by maximum-weight bipartite matching, Hungarian algorithm. A
roster is sixteen players and ten seats, so cost is irrelevant; correctness is
the whole point, because this number IS two awards and a plausible wrong answer
looks exactly like a right one.

**The Hungarian formulation needs at least as many columns as rows**, and with
more seats than players it never finds an augmenting path — `delta` stays
infinite and the loop spins forever. That is what a short roster looks like: a
bye week, an unfilled kicker slot. Every seat now also gets an "leave this one
empty" column priced at zero. The bug surfaced as a hanging test suite, which is
the best possible way for it to surface.

**Verified against an independent exact solver.** A bitmask DP — obviously
correct, far too slow to ship — cross-checks the matching over 500 random
rosters, including superflex-heavy ones where the OP slot actually bites. A
second Hungarian implementation would have shared whatever misconception the
first had.

**IR players are not candidates.** They cannot legally be started, and including
them would hand The Bench Bum to whoever had the unluckiest injury rather than
the worst decision.

**A missing stat line is ZERO here and null everywhere else.** Elsewhere it
means "has not kicked off", and reading it as zero would make a player the
week's biggest projection miss without playing a snap. The optimizer only ever
runs on a final week, where nothing is left to play: he did not score. Treating
him as unknown would silently drop eligible players out of the optimal lineup
and understate every gap.

**No eligibility, no award.** Before `eligible_slots` was stored there was no
constraint set. Both awards stay silent rather than publish an optimum computed
from nothing.

**Sanity check that mattered:** the first real run gave The Bench Bum to 4th and
Inshes at 13.9 — which is exactly Mike Evans, who scored 13.9 on their bench
that week. The optimizer found the real gap without being told where to look.

## 2026-09-14 — Twenty awards, because twelve landed on four people

James: "Seems like a lot of redundancy in those awards." He was right, and it
was structural rather than a bad week.

**Every award is a league-wide extremum over one number, and most of those
numbers measure the same thing.** Week 1's first pass gave ten awards to four
managers. The same Caleb Williams game won both The Prime Specimen and Fantasy
Nostradamus. Substation Superstars took both The Dumpster Fire and The Public
Execution, because the lowest scorer is usually also the biggest loser. Twelve
awards were really about eight measurements, and all eight were flavours of
"who scored a lot this week" — the one axis that clusters.

**The fix was to add awards that measure something other than magnitude**, not
to pass a trophy to the runner-up. Spreading the load by naming someone who did
not actually win is the one move that would have made the page dishonest.

**Position Kings is the only section that spreads mechanically.** It partitions
the player pool instead of ranking managers, so one player cannot be the best
quarterback and the best tight end. Kicker and defence are the most valuable
rows in it precisely because neither has anything to do with whether a team is
any good. It renders as a strip rather than six more cards — nineteen cards plus
six would bury the awards that take judgement under a leaderboard.

**Result: nine of twelve managers on week 1's page, up from four.**

**The Socialist and The One Man Army are one measurement read from both ends**,
the way The Giant Killer already mirrors The Choke Artist. Guarded so one
manager can never hold both ends of it.

**Sweatin' It Out is defined as the largest deficit EVER faced, not "behind
going into Monday night."** The obvious definition needs calendar arithmetic
and picks one arbitrary instant; this one uses the whole snapshot record, needs
no clock, and "came back from 46 down" is the better story anyway. It is the
only award in the library that needs the continuous capture.

**The Micromanager was already built.** James proposed it — most roster moves,
still lost — which is The Galaxy Brain exactly. Flagged rather than shipped
twice; adding redundancy to a change about removing redundancy would have been
a poor joke. The name is his to change.

**The Free Fall cannot exist in week 1**, and says so by being absent. There is
no prior table to fall from, and inventing a starting rank would be a fabricated
number on a real card.

**Studs now outnumber Duds twelve to eight.** James called it explicitly: "I'm
not too worried about having more Studs than Duds. I'm sure this will continue
to evolve." The test that asserted an even split asserted a moment, not an
invariant, and now checks that every award has a section instead.

---

## 2026-09-15 — The Weekly Recap has an author, and he is fictional

**Dr. Bunsen Burner is the byline on every recap.** A
recap written by "the site" reads like a database; one written by a named
correspondent reads like a broadcast. The persona fuses a mad scientist with a
high-energy sportscaster so the lab framing earns jokes instead of decorating
them. He is obviously fictional and his bio says so in his own register; the
point is voice, never a claim that a person wrote this.

Voice, process and boundaries live in `.claude/skills/fantasy-weekly-recap/`,
namespaced so a general-purpose "weekly recap" skill elsewhere in the workspace
cannot collide with it. The
governing rule is **every NFL beat must land on somebody in this league** — a
recap of the Ravens beating the Colts is a news summary anybody can get
elsewhere; a recap noting Derrick Henry went for 144 and three scores *and that
Chenell is the only manager who owns him* is the reason the page exists.

**The recap never states an NFL fact from memory.** The model's training data
is behind the season it is recapping. Every score, stat line and injury in week
1 went through a web search first, and `scripts/gather.ts` supplies every
league number from the database. Nothing in a recap is computed by an LLM — the
awards engine already decided who the Bench Bum is, and the prose dramatises
that verdict rather than re-deriving it.

**The pronoun check is a script, not a test.** The awards engine has a real
test for gendered pronouns because its copy comes from templates — the same
sentence every week, so a rule can be exact. Recap prose cannot be gated that
way: "Colin then benched him" is correct, because *him* is Stefon Diggs. Any
pattern strict enough to catch every violation also fires on legitimate
sentences about NFL players, and a noisy gate gets ignored, which is worse than
none. So it prints candidates for a human pass. On its first run it surfaced
four lines in week 1, two of which were real violations already written.

**Cover art is silhouettes, and the fallback is the point.** Caricatured
players rendered as claymation clowns three times running; rim-lit silhouettes
inside helmets produce the intended energy every time and cannot fail that way.
Models also render scoreboards as garbled pseudo-digits, so the prompt both
forbids text *and* removes the objects that would carry it. `coverImage` is
optional — without one the cover falls back to a generated treatment, so image
work is never the reason a finished recap sits in drafts.

**The responsive suite's recap sample is derived, not pinned.** It named
`week-0-the-lab-opens`, the shortest recap in the archive, with no featured
image and no byline — so the suite kept passing while the cover and byline it
was meant to cover went untested. It now resolves to the newest published
recap, which is both the most elaborate and the one written most recently.

A bug that survived all of this until somebody looked: at a fixed 64px, the
cover's "Week 1" wrapped to two lines at 375px and landed on top of the ghost
numeral. Nothing overflowed the viewport, so every responsive assertion passed.
**Not every layout failure is an overflow.**

**Renamed 2026-09-15:** the character is **Dr. Bunsen Burner** (James: "I think
that's funnier"), titled *Expert In Applied Gridiron Sciences* — a discipline he
named himself. The skill is `fantasy-weekly-recap`, not `weekly-recap`, so a
general "weekly recap" skill for other work in the same Claude Code workspace
cannot be confused with this one.

**The byline appears on every archive card, week 0 included.** It was written
before the character existed, but one card without a face in a row of faces
reads as a rendering bug rather than a meaningful distinction. `author` stays
optional on the type so it does not lie, and the card layout still handles its
absence.

**2026-09-15, same day: the first pass was too safe, and the spec now says so.**
James's note: "the humor feels pretty safe… he doesn't pull any punches. Nobody
is safe from his roasting and he's not afraid to tell a joke that's a little on
the edge of propriety." `voice.md` gained a calibration section with the
concrete moves — escalate past good taste then land flat, diagnose rather than
observe, say the cruel version of the true thing, refuse to let something go *on
the page*, mandatory hot takes, earned nicknames, profanity capped at
hell/damn/God/ass.

**This did not move the roast boundary, and the spec is now explicit about
why.** Burner roasts decisions without mercy; he does not touch bodies.
Injuries, health, family, legal situations are not material at any intensity.
The recap reports Darnold's hip flat and says so in the text — "that is the
entire medical report, it is not funny, and I am not going to make it funny" —
then pivots to the manager who started him and is merciless about *that*. The
boundary is what lets the rest of the voice be as harsh as it is: the roast
stays funny precisely because nobody is mocked for something that happened *to*
them.

Every number survived the rewrite unchanged. The revision is tone only.

**2026-09-15, week 1 corrections — three real errors, all mine, none in the data.**

**A player's team is not something to recall.** The recap built a paragraph on
Isaiah Likely being a Raven. He signed with the Giants in March. `gather.ts`
prints `nfl_team` beside every name and the row said `NYG` the whole time; the
sentence was written from memory around a joke that needed Baltimore. A wrong
team is invisible — the sentence scans, the number is right, and only the league
notices. The fix made the joke better: Chenell also rosters Lamar Jackson, so
"bought Baltimore" is now literally true at 61.8 of 166.0.

**Judge a decision on what was knowable, not on what happened.** The recap
mocked Tyler for starting Sam Darnold, who left on the fifth snap. James:
"An injury is not a manager's decision error." Correct, and the projections back
it — Darnold 17.6, with Young and Rodgers behind him at 19.4 and 18.5. Noise.
Ridiculing it was roasting the injury by proxy, dressed as roasting a lineup.

The distinction now in `voice.md`: a player who **underperformed** is fair game,
because that is the oldest joke in fantasy football. A player who got **hurt** is
not, because there is no better decision the manager could have made with what
they had. The story becomes the *scale of the cost* instead — Tyler scoring the
second-highest total in the league with one starting slot returning half a point,
and losing — which is a better piece of writing than the version where Tyler is
an idiot.

**Six scores in a sentence is a wall.** The scoreboard shipped as prose and was
unreadable. It is now a `scoreboard` block type: one matchup per row, winner
over loser, margin beneath, names truncating against a fixed score column so a
long team name cannot push a number off a 320px screen.

That block also broke `check-pronouns.ts`, which read `b.text` for anything that
was not a stat — and stayed silent under `tsc` because scripts in `.claude/` sit
outside the app's tsconfig. It switches exhaustively now with a `never` default,
so the next block type is a compile error rather than a crash.

**A metaphor Burner has not earned is worse than none.** The Darnold let-off
first read "That was not a blunder. That was weather, and I do not roast the
weather." James: "What does the weather have to do with any of this?" Nothing —
it had no setup anywhere in the piece and no connection to a laboratory, so the
let-off landed on an image the reader had to supply themselves. Rewritten in his
own vocabulary: *"The experiment simply lost its subject on the fifth snap... I
roast bad methodology. I do not roast a specimen walking out of the building."*
`voice.md` now says it: when Burner reaches for a metaphor it comes from the lab.

## 2026-09-15 — The recap remembers the season, mechanically

**A weekly column that cannot remember last week is twelve disconnected blog
posts.** None of that continuity survives a fresh context window, so it is
computed rather than recalled. `scripts/recall.ts` runs before writing and
prints four things:

**Predictions are structured data now.** Burner is supposed to be loudly wrong
in public and own it the following week, and that only works if the bill
arrives. Every call is a `RecapPrediction` on the recap that made it — id,
claim, and a `verdict`/`resolvedWeek`/`resolution` a later week fills in. The
script lists every open one and the skill requires each to be settled on the
page or explicitly carried. Week 1 recorded three.

**Who has been named**, with an OVERDUE flag after two missed weeks. The skill
already said every manager should appear across a season; that is impossible to
track by feel past about week three, and now it is a line of output.

**Imagery already spent**, both across the season and *inside* the week being
written. James: "The folding chair metaphor is overdone in this article." It was
— three benched players described with the same chair inside two paragraphs. The
cross-week scan would never have caught that, so there is a second pass over the
single recap. On its first run it also found "the first quarter" twice in one
section, which was fixed.

Names and the week's central fact repeat legitimately ("highest scoring" four
times in a recap about the highest-scoring Sunday ever), so this is a review aid
like `check-pronouns.ts`, not a gate. The judgement is which repeats are motifs.

**`textOf` is a function declaration, not a const arrow**, because the
within-week scan runs above it and needs it hoisted. Worth leaving alone.

## 2026-09-15 — Managers have pronouns, and they are data

James supplied the list for all twelve. **he/him:** Jesse, Doug, Colin, Mike,
Tyler, Jay, James, Evan, Justin. **she/her:** Chenell, Bree, Keshia.

**This supersedes the they/them-for-everyone rule.** That was a safe default
adopted when the roster's pronouns were unknown — not a claim that the managers
use they/them — and it had started to produce visibly stilted copy: "It requires
Colin to take Colin's advice", where the sentence wanted "his own advice".

**`src/content/managers.ts` is the source of truth**, keyed on first name
because that is what recaps and awards print. `pronounsFor()` falls back to
they/them for anyone unlisted, and that fallback is the one piece of the old
rule that survives permanently: **never infer a pronoun from a name.** An
unlisted manager gets neutral copy until somebody asks them.

**`check-pronouns.ts` got sharper rather than redundant.** It used to flag every
gendered pronoun near a manager; it now asks whether the pronoun *matches that
manager*, in three buckets — a wrong gendered pronoun (real bug), a masculine
one near a she/her manager (usually an NFL player, worth a glance), and neutral
phrasing (not an error, but often a leftover worth making specific). The first
run flagged four; one was Bree's projection, correctly.

**The awards engine uses them too** — James called it the same day, so the
tradeoff was taken rather than deferred. `pron(ctx)` resolves from
`ctx.managerFirst`, so no caller changed: every award already carries the name
it is about. This rewrites copy on already-published cards, normally the drift
§22.8 prevents, and it is an accepted one-off: commentary was always built at
render time rather than stored, and the change makes cards more accurate, not
less.

**The test asked the wrong question and now asks the right one.** It used to
assert that NO gendered pronoun ever appeared — absence as a proxy for
correctness. It now builds every playerless award three times, as a he/him
manager, a she/her manager and an unlisted one, and asserts the pronoun matches
each. Plus a test that the copy *actually inflects* rather than dodging pronouns
altogether, because every other assertion would pass on evasive copy — which is
precisely the behaviour we just moved away from. 350 tests to 382.

## 2026-09-15 — The record book, built out

Twenty-eight records across three sections. Three design calls worth keeping.

**Ties are a first-class concept, not an edge case.** James: "here in our
inaugural season those will effectively be the same thing, so there might be
more people tied for a record than usual." A record has `holders`, plural, and
every one is named. `bestOf` compares on the FORMATTED value rather than the raw
float — two teams on 119.88 and 119.8849 are tied on a page that prints two
decimals, and crowning one of them is a lie the reader can see. Week 1 produces
a six-way tie on Most Wins, and the card says "Shared by 6".

**`tone` is good/bad, replacing `polarity: high/low`.** The old field conflated
"this number is large" with "this is an achievement", and they come apart
constantly: the largest margin of defeat is a big number and a bad day; the
lowest winning score is a small number and still a win. Colour is driven by tone
alone. A test asserts both pairs, because the failure is invisible — a red card
on a good record still renders.

**Margins split into the winner's record and the loser's.** Same number, two
cards, two different teams named. Carrying only one means the biggest beating in
league history has no victim.

**Scope says what the number MEASURES, not which seasons were eligible.**
Everything is all-time. "Most points in a season" is an all-time record whose
unit happens to be a season, and it sits beside the weekly ones under a Week /
Season chip rather than in a fourth section. No current-season scope exists, so
Yahoo's duplicate-row problem cannot recur.

**Only settled weeks count.** Team records already ignored non-FINAL matchups,
but player lines and transactions exist the moment a week opens — so "most
roster moves in one week" was quietly a live counter for the *current* week,
reading "Week 2" before week 2 had been played, on a page whose whole premise is
finished history. A week counts only when every one of its matchups is final.

**Grouped by who is responsible:** Team (scores, margins, streaks, schedules),
Manager (bench, waivers, draft, moves, awards), Player (individual games). That
is the question a reader is actually asking — did the team play well, did the
manager decide well, or did one player have a day. The six per-position bests
are a strip under the player group, not six more cards, for the same reason
Position Kings is a strip on Studs & Duds.

**Not built: Yahoo's Team Statistics tab.** Touchdowns and passing/rushing/
receiving yards are not derivable from what we store — we keep fantasy points,
not NFL box-score lines. It needs a new table and a statId map. Deliberately
skipped.

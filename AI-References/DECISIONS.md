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
"Nothing to seed yet" is correct behaviour rather than a stub — and it still
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
it is not a colour-only signal (§39).
**Amber, per the palette:** `--warn` is already defined as "provisional,
championships". No new colour was introduced.

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
written from documented behaviour and tested against
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
**Section headings take the normal text colour.** Green and red on the headings
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
**Ordering** within each section: manager judgement, then matchup outcomes, then
individual performances, driven by a `category` field rather than array order.

## 2026-08-28 · Player headshots come from ESPN's image combiner
`a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{id}.png&w=..&h=..`
The raw asset is ~240KB; the combiner at display size is ~16KB.
**A fallback is mandatory, not optional:** a player with no photo returns a
404 with a 1-byte body, not a placeholder image. Rookies, practice-squad
call-ups and team defences all miss, so the component swaps in initials onError.

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

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

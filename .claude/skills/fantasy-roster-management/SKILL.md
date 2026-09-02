---
name: fantasy-roster-management
description: Weekly fantasy football roster management across ESPN and Yahoo leagues — reviews the NFL week's results, gathers waiver-wire advice from major outlets, audits each of James's rosters, checks who is available on waivers, and delivers per-league recommendations (waiver claims + drops, IR moves, watch list, trade ideas) via Slack and/or email. Use for the Tuesday waiver report, roster audits, or "who should I pick up / drop / trade" questions.
---

# Fantasy Roster Management

Produce a detailed, per-league roster-management report for James's fantasy
football leagues, and deliver it via Slack webhook and/or email.

## Configuration

- League inventory: `config/leagues.yaml` (relative to this skill directory).
  Every league-specific fact (platform, IDs, roster shape, FAAB vs priority)
  comes from there. **Nothing about any league is hardcoded in this skill.**
- Secrets come **only** from environment variables (set in the Claude Code
  cloud environment settings, or `.env.local` when run locally — never in git):
  - `ESPN_S2`, `ESPN_SWID` — only needed for private ESPN leagues
  - `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REFRESH_TOKEN`
  - `SLACK_WEBHOOK_URL` — Slack incoming webhook for delivery
  - `RESEND_API_KEY`, `REPORT_EMAIL_TO`, `REPORT_EMAIL_FROM` — email delivery
- Endpoint details, request examples, and parsing notes:
  `references/data-sources.md`. Read it before calling any API.
- Report structure: `references/report-format.md`.

## Hard rules

1. **Compute nothing fancy, invent nothing.** Every stat, score, injury tag,
   and availability claim in the report must come from an API response or a
   fetched article. If a data source failed, say so in the report — never fill
   the gap from memory.
2. **Secrets never appear in output.** Not in the report, not in logs, not in
   error messages. If an API call fails, report the status code, not the URL
   with credentials.
3. **Degrade, never die.** If one league or one source fails, finish the rest
   and lead the report with an honest "what's missing" note.
4. **Recommendations are advisory and reasoned.** Every claim/drop/trade
   suggestion states its evidence (usage change, injury, article consensus,
   roster gap). No naked "add Player X."

## Weekly workflow (Tuesday report)

Work through the steps in order; each builds on the last. Use a scratch
directory for intermediate JSON so you can re-check facts while writing.

### 0. Orient

Read `config/leagues.yaml`. Determine the current NFL week (ESPN scoreboard
`week` field, or the fantasy league's `mStatus` view). All later steps scope to
the week that just **ended** (Thu–Mon).

### 1. Review last week's NFL results

Pull the completed week's games from the public ESPN scoreboard (see
data-sources). Note blowouts, injuries mentioned in game notes, and
depth-chart-shifting events (starter benched, backfield takeover, QB change).
This is context for judging waiver targets, not filler for the report.

### 2. Gather waiver-wire consensus

Web-search for this week's waiver-wire articles (e.g. "fantasy football waiver
wire week {N} pickups") and read 2–4 from the reliable outlets listed in
data-sources. Extract: recommended players, positions, suggested FAB
percentages, and the *reasoning*. Track which players appear in multiple
articles — multi-source consensus is a strong signal. Record source names for
attribution in the report.

### 3. Audit each of my rosters

For each league in config: pull my current roster with lineup slots, bye
weeks, and injury designations. Assess: positions where I'm thin or strong,
players on bye next week, injured players (and whether they're IR-eligible),
and underperformers vs. their roster spot.

### 4. Check waiver availability

For each league: pull the free-agent/waiver pool (top ~50 by rostered %, plus
specifically check every player surfaced in step 2). A great waiver target who
isn't available in a given league doesn't belong in that league's claim list —
but may belong on the watch list or as a trade target.

### 5. Build recommendations per league

Cross-reference steps 1–4. For each league produce:

- **IR / housekeeping** — who to move to IR, who is safe to stash, bye-week
  lineup warnings for the coming week.
- **Waiver claims, ranked** — player, position, why (evidence), suggested FAB
  bid or priority usage, and **who to drop** for each claim. Respect the
  league's roster rules from config.
- **Morning-after watch list** — players I'm *not* claiming but should grab
  first thing if they clear waivers, in priority order.
- **Trade ideas** — scan other teams' rosters for surplus at my weak positions
  paired with need at my strong positions; propose 1–3 realistic offers with
  the reasoning. Mark these clearly as ideas, not sure things.

### 6. Write and deliver the report

Format per `references/report-format.md` — one section per league plus a short
cross-league lede. Deliver via every channel whose env vars are present
(Slack webhook, Resend email — curl examples in data-sources). If **no**
delivery channel is configured, print the full report as the final output so
it is at least visible in the session log, and flag the missing configuration.

## Running outside Tuesdays

For ad-hoc questions ("should I claim X?", "audit my roster"), run only the
steps needed to answer, but the same rules apply: fetch real data first, cite
evidence, never guess availability.

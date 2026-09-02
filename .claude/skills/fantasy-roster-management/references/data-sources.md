# Data sources

All requests are read-only. Timeouts: 15s, one retry. On failure, note it and
move on. Cache intermediate JSON in a scratch dir; the big Sleeper player map
especially should be fetched once per run.

## 1. NFL scores & schedule (public, no auth)

```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD-YYYYMMDD
```

- Top-level `week.number` = current NFL week; `events[]` are games with
  `competitions[].competitors[]` (scores, records) and `status`.
- For the completed week, request the Thu–Mon date range explicitly.
- Deeper game detail (scoring plays, injuries-in-game):
  `.../summary?event={eventId}`.

## 2. ESPN Fantasy (league data)

Base (read replica — always use this host):

```
https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}
```

Views stack as repeated query params. The ones this skill needs:

| View | Use |
| --- | --- |
| `mStatus` | current scoringPeriodId (NFL week) |
| `mTeam` | teams, owners, records |
| `mRoster` | all teams' rosters with lineup slots |
| `mSettings` | roster slots, waiver/FAAB config |
| `kona_player_info` | player pool: free agents, projections, injury status |

Private leagues additionally need cookies on every request:
`Cookie: espn_s2={ESPN_S2}; SWID={ESPN_SWID}` (from env; public leagues need
nothing).

**Free agents** — `?view=kona_player_info` with an `X-Fantasy-Filter` header:

```
X-Fantasy-Filter: {"players":{"filterStatus":{"value":["FREEAGENT","WAIVERS"]},"limit":75,"sortPercOwned":{"sortAsc":false,"sortPriority":1}}}
```

To look up specific players from the articles sweep, add
`"filterIds":{"value":[espnPlayerId,...]}` or just search the returned pool by
name.

Parsing gotchas (verified against a live league):
- `scoringPeriodId` (NFL week) ≠ `matchupPeriodId` (fantasy matchup). Don't
  conflate.
- In `player.stats[]`, `statSourceId: 0` = actual, `1` = projected — same array.
- Lineup slot ids: `20` = Bench, `21` = IR, `23` = FLEX.
- `injuryStatus` on the player object carries OUT/DOUBTFUL/QUESTIONABLE/IR
  designations; IR-slot eligibility is `player.injuryStatus == "INJURY_RESERVE"`
  or league-dependent — check `mSettings` roster rules rather than assuming.

## 3. Yahoo Fantasy (official API, OAuth2)

Every call needs a fresh access token — run
`scripts/yahoo-access-token.sh` (uses `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`,
`YAHOO_REFRESH_TOKEN` from env; access tokens last ~1 hour).

```
Authorization: Bearer {access_token}
Base: https://fantasysports.yahooapis.com/fantasy/v2
```

Append `?format=json` to every request (default is XML). Yahoo's JSON is
awkward (arrays of single-key objects) — parse defensively.

| Purpose | Path |
| --- | --- |
| Discover my leagues + team keys | `/users;use_login=1/games;game_codes=nfl;seasons={season}/leagues/teams` |
| League settings | `/league/{league_key}/settings` |
| My roster | `/team/{team_key}/roster/players` |
| All rosters (for trade scan) | `/league/{league_key}/teams/roster` |
| Free agents | `/league/{league_key}/players;status=FA;sort=AR;count=50;start=0` |
| Player search by name | `/league/{league_key}/players;search={name}` |

- Keys look like `{game_id}.l.{league_id}` (league) and
  `{game_id}.l.{league_id}.t.{team_id}` (team). The `game_id` changes every
  season — always discover via the `use_login=1` call rather than hardcoding.
- `sort=AR` = actual rank (recent performance); `sort=R_PO` sorts by percent
  owned. `status=W` lists players currently on waivers, `status=FA` free
  agents — check both.
- Player objects include `status` (Q/O/IR), `bye_weeks`, and
  `percent_owned` sub-resources.

## 4. Sleeper (market signal — public, no auth, no key)

```
GET https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50
GET https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=50
```

Returns `{player_id, count}` — count = number of Sleeper leagues adding/
dropping in the window. This is the single best "what is the market doing
right now" signal.

Resolve ids to names via the full player map (~5 MB, fetch once per run):

```bash
curl -s https://api.sleeper.app/v1/players/nfl > "$SCRATCH/sleeper-players.json"
jq -r '.["11237"] | "\(.full_name) \(.position) \(.team) \(.injury_status)"' "$SCRATCH/sleeper-players.json"
```

The map also carries `injury_status`, `depth_chart_order`, and `team` — useful
cross-checks for IR calls and depth-chart takeovers.

## 5. Waiver-wire articles (web)

Search first — article URLs change weekly and guessing them 404s:

- Search: `fantasy football waiver wire week {N} pickups {year}`
- Reliable outlets that serve plain fetches (verified): cbssports.com,
  nbcsports.com (Rotoworld), sports.yahoo.com, espn.com. fantasypros.com
  blocks generic fetches — skip it rather than fight it.

Read 2–4 articles. Extract per player: position, suggested FAB %, and the
one-line reason. Note the outlet for attribution. Multi-outlet consensus is
the strongest add signal; a player pushed by one outlet only is watch-list
material.

## 6. Delivery

Send through every channel whose env vars exist.

**Slack** (incoming webhook — supports mrkdwn, keep under ~40k chars; split
into one message per league if long):

```bash
curl -s -X POST -H 'Content-type: application/json' \
  --data "$(jq -n --arg t "$REPORT_TEXT" '{text:$t}')" \
  "$SLACK_WEBHOOK_URL"
```

**Email** (Resend):

```bash
curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg from "$REPORT_EMAIL_FROM" --arg to "$REPORT_EMAIL_TO" \
        --arg subj "$SUBJECT" --arg html "$HTML_BODY" \
        '{from:$from, to:[$to], subject:$subj, html:$html}')"
```

Subject convention: `Waiver Wire Report — Week {N} ({date})`.

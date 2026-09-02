# ESPN Fantasy API Reference

> **✅ PARTIALLY VERIFIED — 2026-08-28 against league `793230160`.**
>
> Endpoint access, all 11 views, and league config are **confirmed live**.
> Payload *internals* (statSourceId behavior, slot eligibility, transaction
> shapes) remain unverified because the draft hasn't happened and no games have
> been played. Per spec §60, treat anything still marked ⬜ as untrusted.
>
> Verified league facts live in `LEAGUE-CONFIG.md`.
>
> ESPN can change this API without notice. That is exactly why it lives behind
> `/src/lib/espn/` and nothing else understands these shapes.

---

## Base URLs

| Purpose | URL | Status |
| --- | --- | --- |
| Current season | `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}` | ✅ **200, no auth** |
| Historical season | `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/{leagueId}?seasonId={year}` | ✅ **404 — no prior seasons exist** |
| NFL scoreboard (public) | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` | ⬜ unverified |
| NFL summary / play-by-play | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={eventId}` | ⬜ unverified |

The `lm-api-reads` host is the read replica and is the one to use. The older
`fantasy.espn.com/apis/v3/...` host historically redirected here.

---

## Views

Views are query params and **stack**: `?view=mTeam&view=mRoster&view=mSettings`

| View | Returns | Needed for | Status |
| --- | --- | --- | --- |
| `mStatus` | Season state, current scoring period | Current-week detection | ✅ 200 |
| `mSettings` | Scoring, roster slots, playoff config, waivers | League config, lineup optimizer | ✅ 200 |
| `mTeam` | Teams, owners, records, points | `season_teams`, standings | ✅ 200 |
| `mRoster` | Current rosters w/ lineup slots | Roster sync, snapshots | ✅ 200 (empty pre-draft) |
| `mStandings` | Standings + tiebreak fields | Standings | ✅ 200 |
| `mSchedule` | ⚠️ **returns NOTHING — see gotcha below** | — | ✅ tested |
| `mScoreboard` | Scoreboard w/ scores | Live scoreboard | ✅ 200 |
| `mMatchupScore` | Per-matchup scoring detail | Matchup detail | ✅ 200 — **78 matchups** |
| `mBoxscore` | Per-player scoring in a matchup | Player detail, Studs & Duds | ✅ 200 |
| `mLiveScoring` | Live in-progress scoring | Live polling | ✅ 200 |
| `mTransactions2` | Transaction log | Transaction Log | ✅ **200 NO AUTH — risk cleared** |
| `mDraftDetail` | Draft results | Future draft analysis | ✅ 200 — 180 picks |
| `kona_player_info` | Player pool + projections | Projections, player names | ✅ 200 — `X-Fantasy-Filter` header confirmed working (`filterStatus`, `sortPercOwned`, `limit`), 2026-09-02 |

### Known parameters

- `?scoringPeriodId={n}` — the **NFL week**. Scopes roster/boxscore views.
- `?matchupPeriodId={n}` — the **fantasy matchup period**.
- `x-fantasy-filter` request header — JSON filter for large player queries.

---

## ⚠️ Gotcha: scoringPeriodId ≠ matchupPeriodId

The single most common source of bugs in ESPN fantasy integrations.

- **`scoringPeriodId`** = one NFL week.
- **`matchupPeriodId`** = one fantasy matchup, which **may span multiple NFL
  weeks** (common in playoffs with two-week championship formats).

In a normal regular season they're 1:1 and it's tempting to conflate them. That
assumption breaks in the playoffs — precisely when correctness matters most.

The spec's `matchups` table correctly carries **both** (`week` and
`matchup_period`). Populate both. Never derive one from the other.

---

## ⚠️ Gotcha: `mSchedule` returns no schedule

Counterintuitive and confirmed live: requesting `?view=mSchedule` returns a
payload with **zero schedule entries**. The full season schedule comes back from
**`?view=mMatchupScore`** instead (78 entries for this league).

Use `mMatchupScore` to populate the `matchups` table. Do not trust the view name.

---

## Authentication

**This league (`793230160`) needs none.** ✅ Verified 2026-08-28: every required
view returns 200 with no cookies, including `mTransactions2`. `ESPN_SWID` and
`ESPN_S2` are left blank in `.env.local`.

Keep the cookie code path implemented anyway — if James ever flips the league to
private, ingestion breaks with 401s and the fix should be pasting two values, not
writing code.

Private-league reference, for that case:

```
Cookie: SWID={SWID}; espn_s2={ESPN_S2}
```

- `SWID` includes the surrounding curly braces.
- `espn_s2` is long and URL-encoded — do not re-encode it.
- Cookies expire (roughly a year, sometimes sooner on password change). When
  ingestion starts 401-ing, stale cookies are the first suspect. Surface this
  clearly in `/admin` rather than failing silently.

> **`mTransactions2` risk: CLEARED.** ✅ Returns 200 without cookies on this
> league. (Empty array pre-draft, as expected — no transactions have occurred.)

---

## ID maps

> **All ID maps below are unverified.** Validate against a live payload before
> the parser depends on them. A wrong slot ID silently corrupts the lineup
> optimizer and every award built on it.

### Lineup slot IDs (`lineupSlotId`)

> Partially corroborated: this league's `lineupSlotCounts` uses 0/2/4/6/7/16/17/20/21/23
> in shapes consistent with the table below. **Slot 7 (OP) eligibility is still
> unverified and is the one that matters** — see `LEAGUE-CONFIG.md`.

| ID | Slot | ID | Slot |
| --- | --- | --- | --- |
| 0 | QB | 12 | CB |
| 1 | TQB | 13 | S |
| 2 | RB | 14 | DB |
| 3 | RB/WR | 15 | DP |
| 4 | WR | 16 | D/ST |
| 5 | WR/TE | 17 | K |
| 6 | TE | 18 | P |
| 7 | OP | 19 | HC |
| 8 | DT | **20** | **Bench** |
| 9 | DE | **21** | **IR** |
| 10 | LB | 22 | — |
| 11 | DL | **23** | **FLEX** |

The three that matter most: **20 = Bench, 21 = IR, 23 = FLEX.** Bench/IR
classification drives lineup efficiency, Bench Boss, and Start/Sit Crime.

### Position IDs (`defaultPositionId`)

| ID | Position |
| --- | --- |
| 1 | QB |
| 2 | RB |
| 3 | WR |
| 4 | TE |
| 5 | K |
| 16 | D/ST |

### Pro team IDs (`proTeamId`)

| ID | Team | ID | Team | ID | Team |
| --- | --- | --- | --- | --- | --- |
| 0 | FA | 12 | KC | 24 | LAC |
| 1 | ATL | 13 | LV | 25 | SF |
| 2 | BUF | 14 | LAR | 26 | SEA |
| 3 | CHI | 15 | MIA | 27 | TB |
| 4 | CIN | 16 | MIN | 28 | WSH |
| 5 | CLE | 17 | NE | 29 | CAR |
| 6 | DAL | 18 | NO | 30 | JAX |
| 7 | DEN | 19 | NYG | 33 | BAL |
| 8 | DET | 20 | NYJ | 34 | HOU |
| 9 | GB | 21 | PHI | | |
| 10 | TEN | 22 | ARI | | |
| 11 | IND | 23 | PIT | | |

Note the gaps at 31/32 — the list is not contiguous. Handle unknown IDs
gracefully rather than indexing an array.

---

## ⚠️ Gotcha: actual vs. projected points

Player stat entries carry a **`statSourceId`**:

| `statSourceId` | Meaning |
| --- | --- |
| `0` | **Actual** scored points |
| `1` | **Projected** points |

Both appear in the *same* stats array for the same player and week. Filtering on
the wrong one silently swaps real scores for projections everywhere in the app.

`appliedTotal` on the entry is the fantasy points under league scoring.
`statSplitTypeId` further distinguishes single-week vs. season totals.

**Write a fixture test for this specifically.** It is the highest-consequence,
lowest-visibility mistake available in this integration.

---

## Transactions (`mTransactions2`)

Believed transaction `type` values:

| ESPN value | Maps to our `transaction_type` |
| --- | --- |
| `WAIVER` | `WAIVER` |
| `FREEAGENT` | `FREE_AGENT` |
| `TRADE_ACCEPT` | `TRADE` |
| `ROSTER` | lineup move — likely ignore |
| `DRAFT` | `DRAFT` |

- FAAB bid appears as **`bidAmount`**.
- ESPN returns trades as **separate per-player rows**. Spec §23.4 requires them
  recombined into one two-sided transaction. Group by ESPN transaction id.
- Dedupe on `espn_transaction_id` via upsert. Never insert blind (§15.4).

---

## Operating politely

No published rate limits, but this is an undocumented API we do not own.

- One centralized collector. Never per-user requests (spec §6).
- Combine views into a single request rather than firing several.
- Poll only during real NFL game windows; idle otherwise.
- Back off on failure; never hot-retry in a loop.
- Cache aggressively — every read the app serves comes from Postgres, never ESPN.

---

## Verification checklist

Work through this as soon as `ESPN_LEAGUE_ID` is available. Capture a sanitized
fixture for each into `/fixtures/`.

**Done 2026-08-28:**
- [x] League responds without cookies — **public confirmed**
- [x] `mSettings` — roster slots, playoff count, season length → `LEAGUE-CONFIG.md`
- [x] `mSettings` — seeding rule present: `H2H_RECORD`
- [x] `mTeam` — team ids, names, owner GUIDs → full franchise map
- [x] Schedule captured (via `mMatchupScore`, not `mSchedule`)
- [x] `mTransactions2` — **works without cookies**
- [x] Prior seasons — none exist under this league ID

**Blocked until after the Sept 3 draft / Week 1 games:**
- [ ] Slot 7 (OP) eligibility — **superflex or not?** Blocks lineup optimizer
- [ ] `statSourceId` 0 vs 1 behavior against a real scored week
- [ ] Confirm slots 20 / 21 / 23 against populated rosters
- [ ] Pro team ID map against real player rows
- [ ] Transaction payload shape once real transactions exist
- [ ] `playoffMatchupPeriodLength` once season opens (reads 0 pre-draft)

# The Lab Rats — Verified League Configuration

**Source:** live ESPN `mSettings` / `mTeam` / `mStatus`, pulled 2026-08-28.
✅ = confirmed against a real payload. Do not hardcode any of this — read it from
config — but these are the values to expect.

---

## Identity

| Field | Value |
| --- | --- |
| League name | **The Lab Rats** ✅ |
| ESPN league ID | `793230160` ✅ |
| Season | 2026 ✅ |
| Size | **12 teams** ✅ |
| Public access | ✅ **All views return 200 with no cookies** |
| Prior seasons in ESPN | **None** — `previousSeasons: []`, 2025 returns 404 ✅ |

---

## Schedule & playoffs

| Field | Value |
| --- | --- |
| Regular season | **13 matchup periods** ✅ |
| Final scoring period | **17** ✅ |
| Playoff teams | **6** ✅ |
| Playoff seeding rule | **`H2H_RECORD`** ✅ |
| Divisions | One nominal division ("League Standings") — **effectively none** ✅ |
| Matchups generated | **78** (13 × 6) ✅ |

Weeks 14–17 are the playoffs. With 6 teams, the top 2 seeds take first-round
byes — matching the spec's §21.3 example. `playoffMatchupPeriodLength: 0`
pre-draft; re-check after the season opens.

---

## Roster & lineup slots

Confirmed from `rosterSettings.lineupSlotCounts`:

| Slot ID | Position | Count |
| --- | --- | --- |
| 0 | QB | 1 |
| 2 | RB | 2 |
| 4 | WR | 2 |
| 6 | TE | 1 |
| 7 | **OP** | 1 |
| 23 | FLEX | 1 |
| 16 | D/ST | 1 |
| 17 | K | 1 |
| 20 | Bench | 5 |
| 21 | IR | 1 |

**10 starters · 5 bench · 1 IR · 15 rounds** (draft has 180 pick slots = 12 × 15 ✅)

> ⚠️ **Slot 7 "OP" eligibility is UNVERIFIED and matters a lot.**
> ESPN's OP slot is generally an Offensive Player / superflex slot that accepts
> QB/RB/WR/TE. If it accepts QBs, this is a **superflex league**, which changes
> the lineup optimizer, positional scarcity, and the Stud of the Week weighting.
> **Verify against real rosters after the Sept 3 draft before building the
> optimizer.** Do not assume.

---

## Acquisitions

| Field | Value |
| --- | --- |
| Type | **`WAIVERS_TRADITIONAL`** ✅ |
| Using FAAB budget | **`false`** ✅ |
| Waiver period | 48 hours ✅ |
| Process days | Mon, Wed, Thu, Fri, Sat, Sun ✅ |

> ⚠️ **This league does NOT use FAAB.** Rolling waiver priority instead.
>
> Consequences: **FAAB Bandit** and **FAAB Arsonist** awards are inapplicable —
> drop them from the library. The transaction log should show **waiver priority**,
> not dollar amounts, and "Largest FAAB bid" is not a valid season stat (§23.5).
> `transactions.faab_amount` stays in the schema (harmless, future-proof) but
> will be null.

---

## Draft

| Field | Value |
| --- | --- |
| Type | **SNAKE** ✅ |
| Date | **Thursday, September 3, 2026, 1:00 PM** ✅ |
| Keepers | 0 ✅ |
| Rounds | 15 ✅ |
| Status as of 2026-08-28 | `drafted: false` — **rosters are empty** ✅ |

---

## Franchises — auto-derived from ESPN

ESPN's `members[]` gives real names and `teams[].owners[]` gives the GUID link,
so the entire franchise mapping seeds itself. **No manual roster needed.**

| Team ID | 2026 Team Name | Abbrev | Manager |
| --- | --- | --- | --- |
| 1 | James's Scary Team | JST | James Sowers |
| 2 | 4th and Inshes | 4NI | Colin Gray |
| 3 | Da Reigning Champ | CT | Chenell Basilio |
| 4 | Jay's Team | JFT | Jay Clouse |
| 5 | Substation Superstars | JSS | Justin Moore |
| 6 | Doug's Dangerous Team | DDT | Doug Rotman |
| 7 | Tyler's Talented Team | TTT | Tyler Lindley |
| 8 | Mr. Anderson | MRA | Jesse Anderson |
| 9 | PKM Playmakers | PKM | Mike Schmitz |
| 10 | Waiting to draft... | BFL | Evan Jordan |
| 11 | Keshia's Top-Notch Team | KTT | Keshia Villas |
| 12 | Bree's Badass Boys | BBT | Bree Noble |

Owner GUIDs are the stable cross-season key — seed `franchises.espn_member_id`
from them, not from team IDs or names (§25).

> ⚠️ **Site is public and ungated.** These are real names of real people on the
> open internet. Confirm with James whether to display real names, first names
> only, or team names alone.

---

## Past champions

| Season | Champion | Source |
| --- | --- | --- |
| 2025 | **Chenell Basilio** | ✅ Confirmed by James, 2026-08-28 |

ESPN holds no 2025 season under this league ID, so this is **editorial data**
(spec §13) — entered manually, never overwritten by a sync. Stored in the
`champions` table keyed to the franchise, so it survives team renames.

---

## Display names

**Team name is primary. Manager name is secondary, and real names are allowed.**
Confirmed by James, 2026-08-28.

```
Da Reigning Champ
Manager: Chenell Basilio
```

Applies to scoreboard cards, standings, awards, and record books. Team name
alone is fine where space is tight; manager name never appears without its team.

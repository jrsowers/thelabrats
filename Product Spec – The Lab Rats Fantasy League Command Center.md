# Fantasy League Command Center
## Product Requirements & Technical Specification

**Version:** 0.1  
**Date:** August 27, 2026  
**Status:** Build Specification  
**Primary Platform:** Web  
**Primary Data Source:** ESPN Fantasy Football  
**Working Product Name:** Fantasy League Command Center  
**Final Product Name:** TBD

---

# 1. Executive Summary

Build a private, responsive fantasy-football web application layered on top of an existing ESPN Fantasy Football league.

The application should not attempt to replace ESPN as the system where managers set lineups, add players, make trades, or perform commissioner actions.

Instead, ESPN remains the **system of record**, while this application becomes the league's **analytics, entertainment, history, and live viewing layer**.

The application should ingest data from ESPN, normalize it into its own database, calculate metrics that ESPN does not expose directly, and present them through a polished dashboard.

The primary experiences are:

1. Live league-wide fantasy scoreboard
2. League standings
3. Live playoff picture
4. Studs & Duds weekly/season awards
5. Transaction log
6. Historical record book

The architecture should also intentionally support future functionality including:

- AI-generated weekly recaps
- Play-by-play fantasy event tracking
- Live matchup win probability
- Historical rivalry pages
- Trade analysis
- Waiver acquisition ROI
- Draft analysis
- Team/franchise profile pages
- Weekly email recap distribution
- Commissioner announcements

The application should feel more like a custom ESPN/NFL Network product created specifically for one fantasy league than a generic fantasy statistics dashboard.

---

# 2. Product Philosophy

The application should optimize for three things:

### 2.1 Live utility

During NFL games, league members should genuinely want to keep this app open.

The homepage should immediately answer:

- Who is playing whom?
- What is the score?
- Who is winning?
- What is each team projected to score?
- Which players are currently contributing?
- Which games are still active?
- What does the playoff picture look like right now?

### 2.2 League personality

Fantasy leagues are entertainment products as much as competitions.

The app should surface:

- rivalry
- luck
- bad beats
- managerial mistakes
- brilliant decisions
- records
- streaks
- historical embarrassment
- improbable wins
- major waiver pickups
- memorable players

The tone should feel sports-oriented and playful without becoming visually gimmicky.

### 2.3 Long-term memory

ESPN is the transactional platform.

This application should become the league's permanent historical archive.

Once data is ingested, the app should preserve it independently so historical features do not depend entirely on ESPN continuing to expose old data indefinitely.

---

# 3. Product Scope

## 3.1 Primary Navigation

The desktop application must have persistent left-hand navigation in exactly this order:

1. Live Scoreboard
2. League Standings
3. Playoff Picture
4. Studs & Duds
5. Transaction Log
6. Record Books

The league logo/name should appear above the navigation.

A small season selector may appear near the league name.

Example:

```text
------------------------------------------------
| LEAGUE NAME                                  |
| 2026 Season ▼                                |
|                                              |
| Live Scoreboard                              |
| League Standings                             |
| Playoff Picture                              |
| Studs & Duds                                 |
| Transaction Log                              |
| Record Books                                 |
|                                              |
------------------------------------------------
```

On mobile, convert this navigation into an accessible slide-out menu or bottom navigation pattern.

Do not permanently consume 25-30% of the screen width on mobile.

---

# 4. Homepage Behavior

The homepage route `/` must resolve to the **Live Scoreboard**.

`/scoreboard` may also exist and should render the same primary experience.

Users should not land on a generic welcome screen after authentication.

The fantasy league itself is the product.

---

# 5. Recommended Technology Stack

Use the following stack unless there is a strong technical reason not to.

## Frontend

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui where appropriate
- Lucide icons
- Recharts for charts where useful

## Hosting

- Vercel

Vercel should host:

- Next.js frontend
- server-rendered pages
- lightweight application API routes where appropriate

Do not use Vercel as the primary high-frequency live-data polling scheduler.

## Database / Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Edge Functions
- Supabase Realtime where helpful
- Supabase Cron / pg_cron for scheduled data synchronization

## Email

Future implementation:

- Resend

## AI

Future weekly recap implementation:

- OpenAI API or another configurable LLM provider

The AI provider should be abstracted behind a service interface so changing models/providers does not require rewriting the application.

---

# 6. Critical Architectural Principle

## ESPN must never be queried directly from the browser.

All ESPN communication must happen server-side.

Correct architecture:

```text
ESPN APIs
    |
    v
ESPN Adapter / Ingestion Layer
    |
    v
Normalization Layer
    |
    v
Supabase/Postgres
    |
    v
Application
```

Incorrect architecture:

```text
Browser
   |
   v
ESPN API
```

Reasons:

- ESPN authentication cookies must remain private
- undocumented APIs may change
- centralized polling reduces ESPN requests
- normalized data makes analytics easier
- historical data should survive ESPN changes
- frontend components should not depend on ESPN JSON structures

---

# 7. ESPN Integration Strategy

Create a dedicated ESPN provider module.

Suggested directory:

```text
/src/lib/espn/
    client.ts
    fantasy.ts
    nfl.ts
    types.ts
    transforms.ts
    errors.ts
```

No other part of the application should directly understand ESPN response structures.

Application code should consume normalized internal objects.

Example:

```ts
interface FantasyTeam {
  id: string
  espnTeamId: number
  franchiseId: string
  name: string
  abbreviation?: string
  logoUrl?: string
}
```

rather than raw ESPN JSON.

---

# 8. ESPN Fantasy Data Required

The adapter should support the equivalent of these ESPN Fantasy views:

- `mStatus`
- `mSettings`
- `mTeam`
- `mRoster`
- `mStandings`
- `mSchedule`
- `mScoreboard`
- `mMatchupScore`
- `mBoxscore`
- `mLiveScoring`
- `mTransactions2`

Optional future support:

- `mDraftDetail`
- player pool
- player projections
- player news

The exact ESPN URLs must live only in the ESPN provider layer.

---

# 9. ESPN NFL Data Required

Future live-event functionality should support ESPN NFL endpoints capable of returning:

- NFL schedule
- NFL game status
- box scores
- play-by-play
- scoring plays
- game clock
- quarter
- drives
- NFL win probability where available

This data will eventually allow the application to associate fantasy point changes with actual NFL plays.

Example future relationship:

```text
Ja'Marr Chase
62-yard receiving touchdown

        ↓

+12.7 fantasy points

        ↓

Team Smith
31% → 74% fantasy win probability
```

The initial application does not have to implement all of this before launch, but its database design should not prevent it.

---

# 10. Authentication

This should be a private league application.

Recommended authentication:

- Supabase Auth
- email magic link

Roles:

```text
ADMIN
MEMBER
```

Admin privileges may include:

- trigger manual ESPN sync
- map historical teams to franchises
- edit manager display names
- configure playoff rules
- select season
- regenerate awards
- manage league member access
- eventually generate/send weekly recap

Members are primarily read-only.

No fantasy roster actions should be performed through this application.

---

# 11. Human Setup Checklist

Before handing development entirely to an AI coding agent, the league commissioner should create or collect the following.

## Required Accounts

### GitHub

Create a private repository.

Suggested repository name:

```text
fantasy-league-command-center
```

The AI developer should work through Git commits rather than making untracked changes.

Recommended initial branches:

```text
main
development
```

`main` should always represent deployable code.

---

### Supabase

Create one Supabase project.

Record:

- project URL
- publishable key
- service-role/secret key
- database password

Never commit secrets to Git.

---

### Vercel

Create a Vercel account/project and connect it to the GitHub repository.

Production deployments should follow `main`.

Preview deployments may be created from pull requests or development branches.

---

### ESPN

Collect:

```text
ESPN_LEAGUE_ID
ESPN_SEASON
```

Determine whether the league is public or private.

If private, collect the ESPN authentication cookies:

```text
ESPN_SWID
ESPN_S2
```

These can generally be obtained from browser developer tools while logged into ESPN.

They are credentials.

Never:

- commit them to Git
- expose them as `NEXT_PUBLIC_` variables
- display them in logs
- send them to the browser
- include them in screenshots

Store them only as secure environment variables.

---

## Recommended Accounts

### Resend

Create an account if weekly recap emails are expected later.

Optional initially.

### LLM Provider

Create API credentials for the eventual weekly recap feature.

Optional for MVP.

### Custom Domain

Optional.

Example:

```text
league-name.com
fantasy.league-name.com
```

The application can initially operate on the Vercel-provided domain.

---

# 12. Environment Variables

Create an `.env.example` containing variable names only.

Recommended:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=

ESPN_LEAGUE_ID=
ESPN_SEASON=
ESPN_SWID=
ESPN_S2=

CRON_SECRET=

NEXT_PUBLIC_APP_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

OPENAI_API_KEY=
AI_MODEL=

ADMIN_EMAIL=
```

Optional:

```text
DEMO_MODE=false
LOG_LEVEL=info
ENABLE_NFL_PLAY_TRACKING=false
ENABLE_AI_RECAP=false
```

The application must boot without optional future-feature variables when those features are disabled.

---

# 13. Data Ownership Model

The application should distinguish between:

## ESPN source data

Facts originating from ESPN.

Examples:

- scores
- rosters
- standings
- transactions
- player IDs
- schedules

## Derived application data

Metrics calculated by this application.

Examples:

- lineup efficiency
- bad beat score
- live playoff seed
- bench points
- awards
- all-play record
- historical records
- transaction ROI
- win probability

## Editorial data

Human-created application metadata.

Examples:

- manager nickname
- franchise identity
- custom team abbreviation
- league logo
- award descriptions
- historical notes

Never overwrite source data with derived data.

---

# 14. Core Database Schema

Use database migrations.

Do not manually create production tables without corresponding migration files.

The schema below is conceptual. The developer may adjust columns if necessary while preserving the model.

---

## 14.1 leagues

```text
id
espn_league_id
name
current_season
timezone
created_at
updated_at
```

Potential configuration:

```text
playoff_team_count
regular_season_weeks
playoff_start_week
has_divisions
standings_tiebreaker
```

---

## 14.2 seasons

```text
id
league_id
year
status
regular_season_weeks
playoff_team_count
created_at
```

Unique constraint:

```text
league_id + year
```

---

## 14.3 franchises

Represents a persistent fantasy franchise/manager identity across seasons.

```text
id
league_id
display_name
manager_name
short_name
logo_url
active
created_at
```

Example:

```text
Franchise: James
2024 ESPN Team: The Replacements
2025 ESPN Team: Cleveland Steamers
2026 ESPN Team: Fourth & Drunk
```

All should be capable of mapping to the same franchise.

This is essential for Record Books.

---

## 14.4 season_teams

Maps an ESPN team in a specific season to a persistent franchise.

```text
id
season_id
franchise_id
espn_team_id
team_name
abbreviation
logo_url
division_id
```

Unique:

```text
season_id + espn_team_id
```

---

## 14.5 players

```text
id
espn_player_id
full_name
position
nfl_team
active
last_synced_at
```

Unique:

```text
espn_player_id
```

---

## 14.6 matchups

One row per fantasy matchup.

```text
id
season_id
week
matchup_period
home_team_id
away_team_id
home_score
away_score
home_projected_score
away_projected_score
status
winner_team_id
margin
is_playoff
last_synced_at
```

Status:

```text
SCHEDULED
LIVE
FINAL
```

---

## 14.7 matchup_snapshots

Periodic live snapshots.

```text
id
matchup_id
captured_at
home_score
away_score
home_projected_score
away_projected_score
home_win_probability
away_win_probability
```

Do not create snapshots indefinitely every few seconds.

Only retain useful granularity.

Suggested:

- significant score changes
- plus periodic 5-10 minute checkpoints

---

## 14.8 player_week_scores

```text
id
season_id
week
player_id
fantasy_team_id
lineup_slot
is_starter
projected_points
actual_points
game_status
```

Used heavily by:

- scoreboard
- Studs & Duds
- lineup efficiency
- bench analysis
- records

---

## 14.9 roster_snapshots

Optional but recommended.

```text
id
season_id
week
fantasy_team_id
captured_at
player_id
lineup_slot
```

At minimum capture:

- start of scoring period
- end of scoring period

This creates reliable historical roster context.

---

## 14.10 transactions

```text
id
season_id
espn_transaction_id
transaction_type
status
fantasy_team_id
related_team_id
process_date
week
faab_amount
raw_payload
created_at
```

Transaction types:

```text
WAIVER
FREE_AGENT
DROP
TRADE
DRAFT
OTHER
```

---

## 14.11 transaction_items

```text
id
transaction_id
player_id
action
from_team_id
to_team_id
```

Actions:

```text
ADD
DROP
TRADE
```

---

## 14.12 standings_snapshots

```text
id
season_id
week
captured_at
fantasy_team_id
wins
losses
ties
points_for
points_against
seed
```

Useful for showing movement.

---

## 14.13 playoff_snapshots

```text
id
season_id
week
captured_at
mode
fantasy_team_id
seed
qualified
bye
```

Mode:

```text
OFFICIAL
LIVE_IF_ENDED_NOW
PROJECTED
```

---

## 14.14 awards

```text
id
season_id
week
award_type
award_name
recipient_type
recipient_team_id
recipient_player_id
matchup_id
score
headline
description
metadata
created_at
```

Recipient type:

```text
TEAM
PLAYER
MATCHUP
```

---

## 14.15 nfl_games

Future-ready.

```text
id
espn_event_id
season
week
home_team
away_team
status
start_time
```

---

## 14.16 nfl_plays

Future-ready.

```text
id
nfl_game_id
espn_play_id
sequence
period
clock
play_text
play_type
scoring_play
timestamp
raw_payload
```

---

## 14.17 fantasy_score_events

Future-ready.

Store meaningful fantasy scoring deltas.

```text
id
season_id
week
fantasy_team_id
player_id
matchup_id
captured_at
previous_points
new_points
point_delta
linked_nfl_play_id
match_confidence
```

This table becomes critical for the future weekly recap.

---

## 14.18 sync_runs

```text
id
sync_type
started_at
finished_at
status
records_processed
error_message
metadata
```

Use this for administration and debugging.

---

# 15. Data Synchronization Strategy

The application should have several different synchronization modes.

Do not use one giant sync function for everything.

---

# 15.1 League Metadata Sync

Frequency:

```text
daily
```

Sync:

- league settings
- teams
- owners
- playoff settings
- season status

---

# 15.2 Schedule Sync

Frequency:

```text
daily
```

Sync the full fantasy schedule.

Also run after commissioner schedule changes if manually triggered.

---

# 15.3 Roster Sync

During season:

```text
every 5-15 minutes
```

During active game windows:

```text
every 1-5 minutes
```

Immediately sync again when a transaction is detected.

---

# 15.4 Transaction Sync

Suggested:

```text
every 5 minutes during season
```

Transactions should be upserted by ESPN transaction ID.

Never duplicate a transaction because multiple syncs observed it.

---

# 15.5 Live Scoring Sync

MVP target:

```text
approximately every 60 seconds during active NFL game windows
```

Future target:

```text
approximately every 30 seconds
```

The collector should:

1. determine current fantasy scoring period
2. query live fantasy scoring
3. update matchup totals
4. update player scoring
5. identify meaningful score changes
6. insert necessary snapshots/events
7. notify subscribed clients via database/realtime updates

The UI may refresh more frequently than ESPN ingestion, but it must not query ESPN directly.

---

# 15.6 Finalization Sync

After a fantasy scoring period is finalized:

Capture immutable weekly values:

- final matchup score
- player scores
- starting lineup
- bench
- standings
- transaction state
- awards

Mark week:

```text
FINAL
```

Later ESPN stat corrections should trigger a controlled update.

---

# 16. Demo / Development Mode

This is extremely important.

Football games are not always live while the product is being built.

The repository should contain sanitized fixtures allowing developers to simulate:

- pregame matchup
- live first quarter
- halftime
- Sunday afternoon
- Sunday night
- Monday night
- final result

Example:

```text
/fixtures/
    league.json
    standings.json
    scoreboard-week-5-live.json
    scoreboard-week-5-final.json
    transactions.json
```

When:

```text
DEMO_MODE=true
```

the app should be capable of rendering representative states without contacting ESPN.

This makes AI-assisted development dramatically easier.

---

# 17. Shared User Interface Requirements

The design should feel:

- sports editorial
- polished
- dense enough to be useful
- easy to scan
- modern
- responsive
- not cartoonish
- not a generic SaaS admin dashboard

Prefer:

- clear typography
- strong score emphasis
- compact stat labels
- restrained use of cards
- meaningful color states
- subtle team branding
- obvious live indicators

Avoid:

- excessive gradients
- giant empty cards
- glassmorphism
- excessive animation
- dashboard templates that feel like accounting software

---

# 18. Global Header

Main content header should include:

```text
League Name
Season
Week selector
Last updated timestamp
```

During live games:

```text
LIVE
Updated 28 sec ago
```

Manual refresh button may be provided.

Manual refresh should refresh the app's data from the database.

Admin-only "Sync ESPN Now" can trigger upstream synchronization.

---

# 19. FEATURE 1: Live Scoreboard

## Route

```text
/
 /scoreboard
```

## Objective

Show all current fantasy matchups on one screen.

This is the application's primary homepage.

---

# 19.1 Week Selection

Allow:

```text
< Week 7 >
```

Default automatically to current scoring period.

Past weeks should display final scores.

Future weeks should display scheduled opponents.

---

# 19.2 Matchup Card

Every matchup card should display:

- team logo
- team name
- current score
- projected final score
- record entering week
- current matchup status
- number of active players
- number of players remaining

Example:

```text
TEAM SMITH                104.72
7-2                    Proj. 129.4
3 active | 2 remaining

          VS

TEAM MILLER               97.16
6-3                    Proj. 118.7
2 active | 3 remaining
```

Highlight the current leader.

Do not imply that the current leader has won until matchup is final.

---

# 19.3 Matchup Status

Possible:

```text
PREGAME
LIVE
FINAL
```

Optional detailed status:

```text
3 players currently active
```

---

# 19.4 Expand Matchup

Clicking a matchup should expose individual lineups.

Show:

```text
PLAYER
POSITION
NFL TEAM
OPPONENT
STATUS
PROJECTED
ACTUAL
```

Separate:

```text
STARTERS
BENCH
```

Highlight players currently in active NFL games.

---

# 19.5 Scoreboard Metrics

At top of page optionally show:

```text
Highest score
Lowest score
Closest matchup
Biggest lead
```

During live weeks these are provisional.

---

# 19.6 Acceptance Criteria

- Every league matchup is represented exactly once.
- Current scores match ESPN within expected polling delay.
- Historical week scores remain stable.
- Live data updates without full-page reload.
- No browser request contains ESPN cookies.
- Past/future week navigation works.
- Matchup lineups reconcile with ESPN.

---

# 20. FEATURE 2: League Standings

## Route

```text
/standings
```

## Objective

Provide a better league table than ESPN.

---

# 20.1 Core Columns

Display:

```text
Seed
Team
Record
Win %
Points For
Points Against
Streak
```

Optional:

```text
All-Play Record
Expected Wins
Luck Rating
```

Do not make optional advanced metrics blockers for MVP.

---

# 20.2 Playoff Cutoff

Display a visual playoff line.

Example:

```text
1 Team A
2 Team B
3 Team C
4 Team D
5 Team E
6 Team F
---------------- PLAYOFF LINE
7 Team G
8 Team H
```

---

# 20.3 Sorting

Default sorting must exactly reproduce league seeding rules.

Users may optionally sort columns without altering official seed display.

---

# 20.4 Movement

If standings snapshots exist:

```text
#3 ↑2
#6 ↓1
```

Movement should compare to the previous finalized week.

---

# 20.5 Acceptance Criteria

- Official standings match ESPN.
- Tied teams are ordered according to configured league rules.
- Playoff line displays correctly.
- Points For and Points Against reconcile with ESPN.
- Previous-week movement is accurate.

---

# 21. FEATURE 3: Playoff Picture

## Route

```text
/playoffs
```

## Objective

Continuously answer:

**What would the playoffs look like if the season ended right now?**

---

# 21.1 Modes

Provide toggle:

```text
IF SEASON ENDED NOW
PROJECTED
```

### If Season Ended Now

Treat current live matchup leaders as if current scores were final.

Apply those hypothetical wins/losses to standings.

Then apply league tiebreakers.

### Projected

Use ESPN live projected final scores to assign hypothetical matchup winners.

Then recalculate standings and seeds.

---

# 21.2 Official State

When no games are active:

```text
IF SEASON ENDED NOW
```

should effectively represent standings after finalized results.

---

# 21.3 Bracket

Render the actual configured playoff format.

Support:

- configurable playoff team count
- first-round byes
- custom regular-season length
- divisions where applicable

Example:

```text
#1 Team A       BYE
#2 Team B       BYE

#3 Team C
        \
         Winner
        /
#6 Team F


#4 Team D
        \
         Winner
        /
#5 Team E
```

Do not hardcode six playoff teams.

---

# 21.4 Bubble View

Below bracket show:

```text
IN

#1 Team A
#2 Team B
...
#6 Team F

------------- PLAYOFF LINE

OUT

#7 Team G
#8 Team H
```

---

# 21.5 Movement

During live games:

```text
Team F
#7 → #6
```

should be possible.

---

# 21.6 Tiebreaker Explanation

When teams are tied, provide an optional detail:

```text
Team F currently wins tiebreaker over Team G

Reason:
Points For
1,284.6 vs 1,269.3
```

This is extremely valuable for user trust.

---

# 21.7 Playoff Calculation Engine

Create this as a pure, independently testable module.

Suggested:

```text
/src/lib/playoffs/
    calculateStandings.ts
    calculateSeeds.ts
    calculateBracket.ts
    tiebreakers.ts
```

Never bury playoff logic inside React components.

---

# 21.8 Acceptance Criteria

Given a known set of:

- records
- live matchup scores
- projections
- tiebreaker values

the engine should always produce deterministic standings.

Write extensive unit tests.

This is one of the highest-risk logic areas in the application.

---

# 22. FEATURE 4: Studs & Duds

## Route

```text
/awards
```

Navigation label:

```text
Studs & Duds
```

## Objective

Create an ESPN-style weekly awards screen highlighting excellent, terrible, lucky, unlucky, brilliant, and embarrassing performances.

---

# 22.1 Time Filters

Provide:

```text
WEEK
SEASON
ALL-TIME
```

Week view should default to the most recent completed week.

During an active week:

```text
Week 8 - In Progress
```

awards may be shown as provisional.

Clearly label them.

---

# 22.2 Award Philosophy

Do not show every possible award every week.

Maintain a library of awards.

Choose approximately:

```text
8-12
```

of the most interesting applicable awards each week.

Awards with no meaningful candidate should not appear.

---

# 22.3 Manager Awards

Initial library:

### Manager of the Week

Composite based on:

- team score
- lineup efficiency
- matchup strength
- meaningful roster decisions

### Bench Boss

Manager who left the most fantasy points on the bench.

### Start/Sit Crime of the Week

Most consequential lineup mistake.

Prioritize decisions that could have changed a matchup result.

### Waiver Wire Wizard

Best recent waiver/free-agent acquisition.

### FAAB Bandit

Best production for minimal acquisition cost.

### FAAB Arsonist

Worst return on a meaningful FAAB expenditure.

### Nostradamus Award

Unexpected low-projected starter who dramatically exceeded expectation.

### Galaxy Brain Award

Unconventional managerial decision that succeeded.

### Too Cute Award

Unconventional managerial decision that failed badly.

### Highway Robbery

Lowest-scoring winning team.

### Bad Beat of the Week

Highest-scoring losing team.

### Great Escape

Winner who had the lowest observed live win probability.

Future event tracking required for best implementation.

### Choke Job

Team that blew the highest live win probability.

Future event tracking required.

### Luckiest Team Alive

Largest positive gap between actual wins and expected/all-play wins.

### Cursed Franchise

Largest negative gap between expected wins and actual wins.

### Playoff Wrecker

Result that most damaged another team's playoff position.

---

# 22.4 Player Awards

### Stud of the Week

Highest-impact fantasy starter.

### Dud of the Week

Worst meaningful performance relative to expectation.

Do not simply select the lowest score.

### Projection Smasher

Largest:

```text
Actual - Projected
```

### Projection Disaster

Largest:

```text
Projected - Actual
```

among meaningful starters.

### Benchwarmer MVP

Highest-scoring benched player.

### Waiver Wire Hero

Best performance by a recently acquired player.

### One-Man Army

Player responsible for the largest percentage of a fantasy team's weekly score.

### Heartbreaker

Player whose performance most directly damaged an opponent.

Best implemented once event tracking exists.

---

# 22.5 Matchup Awards

### Photo Finish

Closest matchup.

### Public Execution

Largest margin of victory.

### Shootout of the Week

Highest combined matchup score.

### Dumpster Fire of the Week

Lowest combined matchup score.

### David vs. Goliath

Largest underdog victory according to pregame projections.

### Fantasy Football Is Stupid Award

Algorithmic catch-all for the week's most statistically absurd result.

Potential inputs:

- low all-play percentile but victory
- extremely low win probability comeback
- tiny margin
- playoff consequences
- huge bench points
- unusual projected-vs-actual divergence

---

# 22.6 Award Cards

Each award should have:

```text
Award name
Recipient
Primary metric
Short explanation
Supporting stats
```

Example:

```text
START/SIT CRIME OF THE WEEK

Team Miller

Benched:
Player A - 28.7

Started:
Player B - 9.4

Decision Cost:
19.3 points

Final Margin:
Lost by 4.8
```

---

# 22.7 Season Award Leaderboard

Season view should show repeat winners.

Example:

```text
BENCH BOSS

Miller       4
Smith        3
Johnson      1
```

---

# 22.8 Acceptance Criteria

- Awards are deterministic from stored data.
- Each award algorithm has a documented formula.
- Awards can be regenerated.
- Provisional awards never masquerade as final.
- Empty/uninteresting awards are omitted.
- A human-readable explanation is generated from factual values, not hallucinated.

---

# 23. FEATURE 5: Transaction Log

## Route

```text
/transactions
```

## Objective

Provide a complete chronological ledger of league roster activity.

---

# 23.1 Supported Activity

Display:

- waiver claims
- free-agent adds
- drops
- add/drop combinations
- trades
- FAAB amounts where applicable

Optional later:

- trade veto events
- commissioner actions
- draft picks

---

# 23.2 Filters

Provide:

```text
All
Waivers
Free Agents
Trades
```

Additional filters:

```text
Week
Team
Player
```

---

# 23.3 Chronological Layout

Group by date.

Example:

```text
WEDNESDAY, SEPTEMBER 23

10:14 AM
Team Smith

CLAIMED
Player A

DROPPED
Player B

FAAB
$17


9:02 AM
Team Miller

ADDED
Player C

DROPPED
Player D

Free Agent
```

---

# 23.4 Trades

Trades should be displayed as one combined transaction whenever possible.

Example:

```text
TRADE

Team Smith receives:
Player A
Player B

Team Miller receives:
Player C
```

Avoid showing separate confusing transaction rows for each individual player movement.

---

# 23.5 Transaction Stats

Top-level season summary may include:

```text
Total moves
Total waiver claims
Total trades
Most active manager
Largest FAAB bid
```

---

# 23.6 Acceptance Criteria

- Transactions appear once and only once.
- FAAB values match ESPN.
- Adds and drops are correctly associated.
- Trades display both sides.
- Filters work.
- Transactions remain available historically after ingestion.

---

# 24. FEATURE 6: Record Books

## Route

```text
/records
```

## Objective

Create a permanent historical archive of league achievements and failures.

This page should become increasingly valuable every season.

---

# 24.1 Historical Import

The system should be capable of importing previous ESPN seasons.

Do not assume historical team IDs represent permanent franchise identities.

Use:

```text
franchise
        ↓
season_team
        ↓
ESPN team
```

Admin must be able to correct mappings.

---

# 24.2 Record Categories

## Team Weekly Records

- highest weekly score
- lowest weekly score
- largest margin of victory
- closest win
- highest losing score
- lowest winning score
- highest combined matchup score
- lowest combined matchup score

## Team Season Records

- most wins
- fewest wins
- highest Points For
- lowest Points For
- highest Points Against
- best win percentage
- longest win streak
- longest losing streak

## Franchise Records

- championships
- championship appearances
- playoff appearances
- regular-season wins
- all-time losses
- all-time points scored
- all-time winning percentage
- longest head-to-head streak

## Player Records

Where historical player data is available:

- highest fantasy player score in one week
- highest QB week
- highest RB week
- highest WR week
- highest TE week
- highest kicker week
- highest D/ST week

## Manager Misery

Optional playful section:

- most points scored in a loss
- most bench points
- worst lineup efficiency
- biggest blown projection advantage
- longest playoff drought

---

# 24.3 Record Display

Every record must include context.

Bad:

```text
178.4
```

Good:

```text
HIGHEST WEEKLY SCORE

178.4
Team Smith

Week 11, 2024
def. Team Miller 178.4 - 121.7
```

---

# 24.4 Record Detail

Clicking a record should eventually allow users to inspect the original matchup.

---

# 24.5 Acceptance Criteria

- Historical records are calculated from normalized data.
- Renamed teams remain associated with correct franchise.
- Ties are supported.
- Every record identifies season/week.
- Historical recalculation can be triggered after imports.

---

# 25. Team Identity Problem

This deserves explicit attention.

Fantasy team names change.

Managers may rename franchises yearly.

ESPN team IDs may not be appropriate as permanent historical identifiers.

Therefore the app must have a persistent:

```text
franchise_id
```

Admin needs a screen such as:

```text
2024 "Touchdown There"
→ James Franchise

2025 "Fourth and Drunk"
→ James Franchise

2026 "The Replacements"
→ James Franchise
```

Without this layer, Record Books will eventually become unreliable.

---

# 26. Lineup Efficiency

Define:

```text
actual starter points
------------------------
maximum legal lineup points
```

Do not simply add the highest bench players.

The calculation must respect roster positions.

Example:

If lineup requires:

```text
QB
RB
RB
WR
WR
TE
FLEX
K
DST
```

the optimizer must construct the highest-scoring legal lineup.

Use an independently testable lineup optimizer.

---

# 27. All-Play Record

For each week, pretend every fantasy team played every other team.

Example:

12-team league.

A team with the week's third-highest score receives:

```text
9-2 all-play record
```

Season all-play standings can then reveal:

- lucky teams
- unlucky teams
- schedule strength effects

This metric should be stored or reproducible.

---

# 28. Expected Wins / Luck

Simple initial implementation:

```text
Expected Weekly Wins =
All-Play Win Percentage
```

Compare cumulative expected wins to actual wins.

Example:

```text
Actual wins:      7
Expected wins:    4.9

Luck differential:
+2.1 wins
```

Positive = fortunate.

Negative = unfortunate.

More sophisticated models may come later.

---

# 29. Playoff Tiebreakers

Do not guess.

The human commissioner must confirm the league's configured playoff/seeding tiebreakers.

Store these as league configuration.

Potential hierarchy:

```text
1. Overall record
2. Head-to-head
3. Points For
4. Division record
5. Other configured rule
```

The application must be able to explain a tiebreaker result.

If the exact ESPN behavior cannot be confidently reproduced, label the playoff picture:

```text
Unofficial
```

until validated.

---

# 30. Background Job Design

Suggested jobs:

```text
sync-league-metadata
sync-schedule
sync-rosters
sync-transactions
sync-live-scoring
finalize-week
calculate-standings
calculate-playoff-picture
calculate-awards
recalculate-records
```

Future:

```text
sync-nfl-games
sync-nfl-plays
correlate-fantasy-events
generate-weekly-recap
send-weekly-recap
```

Each job should:

- be idempotent
- log a sync run
- tolerate retry
- avoid creating duplicates
- produce meaningful error logs

---

# 31. Error Handling

ESPN is an undocumented dependency.

Assume occasional failures.

The application must degrade gracefully.

If ESPN fails:

Bad behavior:

```text
500 Internal Server Error
```

Preferred:

```text
Live data temporarily unavailable.

Last successful update:
3:42 PM
```

Continue rendering cached database data.

---

# 32. ESPN Adapter Versioning

Every ESPN integration transformation should have automated fixture tests.

When ESPN changes a payload, developers should be able to update:

```text
/src/lib/espn/
```

without rewriting application pages.

This abstraction is mandatory.

---

# 33. Raw ESPN Payload Retention

For debugging, optionally store selected raw ESPN responses in short-term debug storage or JSONB.

Do not permanently duplicate every full response forever.

Prioritize normalized historical data.

Suggested raw retention:

```text
7-30 days
```

or store only failed/unrecognized responses.

---

# 34. Security

Mandatory:

- ESPN credentials server-side only
- Supabase service key server-side only
- RLS enabled
- no secrets in Git
- no secrets in frontend bundles
- authenticated access to private league data
- admin actions authorization checked server-side
- cron endpoints authenticated
- input validation on all API routes

Use secure environment variables for cron secrets.

---

# 35. Performance Targets

The application is small-scale but should feel instant.

Target:

Initial page render:

```text
< 2 seconds under normal conditions
```

Navigation between cached pages:

```text
near-instant
```

Live score latency:

```text
approximately 30-90 seconds behind ESPN
```

Do not attempt sub-second realtime fantasy scoring.

It provides little value and creates unnecessary complexity.

---

# 36. Realtime UI Strategy

Recommended:

ESPN collector updates Supabase.

Then either:

### Option A

Supabase Realtime notifies connected clients.

Preferred.

### Option B

Client re-fetches internal API/database every 15-30 seconds.

Acceptable MVP.

Do not let every user poll ESPN.

---

# 37. Loading States

Use skeletons.

Do not use giant centered spinners for normal page loads.

During live refresh, preserve existing scores while fetching updates.

Never blank the scoreboard during refresh.

---

# 38. Empty States

Examples:

Transactions:

```text
No transactions have been recorded this week.
```

Awards:

```text
Week 8 is still in progress.
Final Studs & Duds will be calculated after scoring is finalized.
```

Records:

```text
Historical seasons have not been imported yet.
```

---

# 39. Accessibility

Minimum:

- keyboard navigation
- semantic table markup
- sufficient contrast
- visible focus indicators
- scores not communicated by color alone
- accessible menu on mobile
- appropriate ARIA status for live updates where needed

---

# 40. Admin Tools

Create a minimal admin route:

```text
/admin
```

Only ADMIN users can access.

Initial functions:

### Data

- Sync ESPN Now
- View last successful sync
- View failed syncs
- Finalize/reprocess week
- Import historical season

### League

- edit display name
- configure playoff count
- configure tiebreaker order
- configure regular-season weeks

### Franchises

- map ESPN season team to persistent franchise

### Awards

- recalculate awards

### Records

- recalculate record book

Do not spend excessive design effort on admin UI.

Function matters more than polish here.

---

# 41. Observability

At minimum log:

```text
job
timestamp
duration
success/failure
ESPN endpoint category
records changed
error
```

Admin dashboard should show:

```text
Fantasy live scoring
Last sync: 37 sec ago
Status: Healthy

Transactions
Last sync: 4 min ago
Status: Healthy
```

---

# 42. Testing Strategy

## Unit Tests

Mandatory for:

- tiebreakers
- playoff seeding
- bracket creation
- lineup optimization
- all-play records
- award selection
- transaction transformation
- ESPN normalization

## Fixture Integration Tests

Use saved sanitized ESPN JSON.

Example:

```text
input:
espn-live-scoring.json

expected:
normalized-matchups.json
```

## End-to-End

Minimum:

- login
- open scoreboard
- switch week
- expand matchup
- view standings
- view playoff picture
- filter transactions
- view awards
- view records

---

# 43. Data Validation

When ingesting ESPN data, validate payload shapes.

Recommended:

```text
Zod
```

Do not blindly trust JSON response properties.

If a payload fails validation:

1. save useful diagnostic information
2. mark sync failed
3. continue serving last-known-good data
4. do not corrupt normalized tables

---

# 44. Application Folder Structure

Suggested:

```text
/app
    /(authenticated)
        /scoreboard
        /standings
        /playoffs
        /awards
        /transactions
        /records
        /admin

/components
    /navigation
    /scoreboard
    /standings
    /playoffs
    /awards
    /transactions
    /records
    /shared

/lib
    /espn
    /playoffs
    /standings
    /awards
    /records
    /lineup
    /transactions
    /supabase

/types

/supabase
    /migrations
    /functions

/fixtures

/tests
```

The exact structure may differ, but domain logic must remain separate from UI components.

---

# 45. Phase 1 Build Order

The coding agent should not attempt every feature simultaneously.

## Milestone 1: Foundation

Complete:

- GitHub project
- Next.js
- Tailwind
- Supabase connection
- authentication
- protected application shell
- left navigation
- database migrations
- environment configuration
- ESPN provider skeleton
- demo mode

Success condition:

User can log in and navigate empty application pages.

---

# 46. Milestone 2: ESPN League Import

Complete:

- settings
- teams
- players
- schedule
- standings
- current rosters

Success:

Admin presses:

```text
Sync ESPN
```

and database contains normalized league data.

---

# 47. Milestone 3: Live Scoreboard

Complete:

- current week detection
- matchups
- live scores
- projections
- player lineup detail
- periodic sync
- realtime/refetch frontend

Success:

During live NFL games, scoreboard updates without manually refreshing the page.

This is the first major product milestone.

---

# 48. Milestone 4: Standings

Complete:

- official standings
- playoff line
- weekly movement
- all-play metrics

Success:

Official ordering matches ESPN.

---

# 49. Milestone 5: Playoff Picture

Complete:

- seeding engine
- tiebreakers
- live hypothetical standings
- projected mode
- bracket
- playoff bubble

Success:

Changing live matchup winners correctly changes hypothetical playoff seeds.

---

# 50. Milestone 6: Transactions

Complete:

- transaction ingestion
- dedupe
- adds
- drops
- waiver claims
- FAAB
- trades
- filtering

---

# 51. Milestone 7: Studs & Duds

Implement deterministic awards first.

Initial required awards:

```text
Manager of the Week
Stud of the Week
Dud of the Week
Bench Boss
Start/Sit Crime
Projection Smasher
Projection Disaster
Bad Beat
Highway Robbery
Photo Finish
Public Execution
Shootout
Dumpster Fire
Waiver Wire Wizard
```

Do not block release on sophisticated event-based awards.

---

# 52. Milestone 8: Record Books

Complete:

- historical import
- franchise mapping
- weekly records
- season records
- franchise records
- record recalculation

---

# 53. Phase 2: Live Event Engine

After MVP works reliably, implement:

```text
NFL play ingestion
Fantasy score delta tracking
Play-to-fantasy correlation
Live fantasy win probability
Significant event detection
```

This powers:

- Great Escape
- Choke Job
- Heartbreaker
- Monday Night Miracle
- live lead changes
- future AI recap

---

# 54. Phase 3: AI Weekly Recap

The architecture should eventually support an automated ESPN-style weekly recap.

Workflow:

```text
Week finalizes
      ↓
Collect final matchup results
      ↓
Collect major fantasy events
      ↓
Collect transactions
      ↓
Collect awards
      ↓
Collect playoff movement
      ↓
Collect historical context
      ↓
Story ranking engine
      ↓
Structured factual briefing
      ↓
LLM
      ↓
Weekly recap
      ↓
Email
```

Critical principle:

The LLM should not independently discover facts from raw data.

The analytics engine should create structured facts first.

Example:

```json
{
  "storyType": "comeback",
  "winner": "Team Smith",
  "loser": "Team Miller",
  "lowestWinProbability": 0.08,
  "finalMargin": 2.4,
  "turningPoint": {
    "player": "Ja'Marr Chase",
    "fantasyDelta": 12.7,
    "play": "62-yard receiving touchdown"
  }
}
```

Then the LLM converts facts into entertaining prose.

This minimizes hallucination.

---

# 55. AI Recap Voice

Future default style:

- ESPN/NFL Primetime energy
- witty
- personalized
- mildly roasting
- factual
- concise
- understands league history
- willing to celebrate and mock managers
- never cruel or personally sensitive

The system should roast fantasy decisions, not people's real lives.

---

# 56. Email Recap

Future.

Use Resend.

Send after weekly scoring is finalized.

Possible subject:

```text
Week 8 Recap: Miller Blew a 94% Win Probability
```

Email content may include:

- week headline
- matchup recaps
- Studs & Duds
- transaction story
- playoff movement
- historical record
- manager-specific notes

Store the generated recap before sending.

Never generate a unique version independently for each recipient unless intentionally implemented.

---

# 57. Non-Goals for Initial Build

Do not build:

- roster management
- lineup submission
- waiver claims
- trade proposals
- commissioner scoring changes
- fantasy draft room
- NFL betting
- social network
- native iOS application
- native Android application

Users should continue using ESPN for league actions.

---

# 58. Human Decisions Required Before Final Production

The application developer should create placeholders but may need commissioner confirmation for:

### Exact league tiebreaker hierarchy

Do not assume.

### Franchise continuity

Which historical team belongs to which manager/franchise?

### Historical seasons

How far back should Record Books go?

### Authentication

Should only league members have access?

Recommended: yes.

### Display names

Manager real name vs fantasy team name.

Recommended: show both when useful.

### Team branding

Use ESPN team logos if available.

### League branding

League name and optional logo.

---

# 59. Human Setup Sequence

Recommended order for commissioner:

```text
1. Create private GitHub repo
2. Create Supabase project
3. Create Vercel project
4. Connect Vercel to GitHub
5. Collect ESPN league ID
6. Collect ESPN auth cookies if required
7. Add environment variables locally
8. Add environment variables to Vercel/Supabase
9. Give coding agent PRODUCT_SPEC.md
10. Have agent build Milestone 1
11. Validate ESPN import
12. Validate franchise mapping
13. Validate playoff rules
14. Begin feature milestones
15. Create Resend account later
16. Add AI API later
```

---

# 60. Instructions for AI Coding Agents

The following instructions should be treated as mandatory.

## Do not fabricate ESPN response schemas.

If uncertain:

- inspect actual response
- create fixture
- update parser
- document assumption

## Never expose ESPN credentials.

## Do not query ESPN from React client components.

## Store normalized data.

## Use idempotent upserts.

## Write migrations.

## Keep business logic out of React components.

## Create tests for every meaningful calculation engine.

## Prefer deterministic calculations over AI.

## Do not use an LLM to calculate standings, playoff seeds, records, or awards.

## Treat AI as a writing layer, not a source of truth.

## Build with demo fixtures so features can be developed outside NFL game windows.

## Preserve last-known-good data if ESPN is temporarily unavailable.

## Do not overengineer for thousands of leagues.

This is currently a single-league application.

## However, do not hardcode one specific team count.

Support league configuration.

## Keep ESPN behind a provider interface.

Future data-provider substitution should be possible.

---

# 61. Definition of MVP

The application is MVP-ready when:

1. User can authenticate.
2. Homepage displays every matchup.
3. Live scores update automatically.
4. Users can inspect individual lineup scoring.
5. Standings match ESPN.
6. Playoff Picture correctly calculates "if the season ended now."
7. Projected playoff view works.
8. Transaction log captures adds, drops, waivers, FAAB and trades.
9. Studs & Duds produces meaningful weekly awards.
10. Record Books can calculate records from imported historical seasons.
11. Application works on desktop and mobile.
12. ESPN credentials remain private.
13. Failed ESPN sync does not take the site down.
14. Admin can manually trigger a sync.
15. Core calculation engines have automated tests.

---

# 62. Definition of Phase 2 Success

Phase 2 is successful when the system can reconstruct important fantasy events during an NFL weekend.

Example:

```text
3:42 PM

Team Smith
104.6

Team Miller
109.8

Ja'Marr Chase scores 62-yard TD

Team Smith
117.3

Team Miller
109.8
```

and persist:

```text
Player
NFL play
Fantasy point delta
Fantasy matchup
Before score
After score
Before win probability
After win probability
Timestamp
```

---

# 63. Definition of Long-Term Success

The product succeeds if league members:

- keep the scoreboard open on Sundays
- check playoff scenarios late in the season
- laugh at Studs & Duds
- use Transaction Log to remember moves
- reference historical records during arguments
- look forward to the weekly recap
- consider the app the league's permanent archive

The goal is not merely to reproduce ESPN.

The goal is to create the digital home of the fantasy league.

---

# 64. First Prompt to Give the Coding Agent

After providing this specification, use approximately this instruction:

"Read PRODUCT_SPEC.md completely before writing code. Treat it as the source of truth for the application. First inspect the repository and produce a concise implementation plan for Milestone 1 and Milestone 2. Then begin implementation without asking me to make routine technical decisions that are already resolved by the specification. Use Next.js, TypeScript, Tailwind, Supabase and the architecture described in the PRD. Keep ESPN access server-side and behind a provider abstraction. Create database migrations and demo fixtures from the beginning. Do not attempt later milestones until the foundation and ESPN import pipeline work reliably. Commit work in logical increments and maintain a running TODO/status document in the repository."

---

# 65. Suggested Repository Documentation

The coding agent should create and maintain:

```text
README.md
PRODUCT_SPEC.md
ARCHITECTURE.md
SETUP.md
TODO.md
.env.example
```

### README.md

Short product overview.

### PRODUCT_SPEC.md

This document.

### ARCHITECTURE.md

Actual implemented architecture and important technical decisions.

### SETUP.md

Exact local, Supabase, ESPN and Vercel setup instructions.

### TODO.md

Milestones and implementation status.

This gives subsequent AI coding sessions enough persistent context to continue the project without re-discovering previous decisions.

---

# 66. Final Engineering Priority

When tradeoffs are necessary, prioritize in this order:

```text
Data correctness
      ↓
Historical durability
      ↓
Security
      ↓
Reliability
      ↓
Usability
      ↓
Visual polish
      ↓
Novel features
```

A gorgeous playoff bracket with incorrect seeding is a failed feature.

A hilarious award based on incorrect lineup data is a failed feature.

A slightly plain interface with trustworthy league data can always be improved later.

Build the data foundation correctly first.
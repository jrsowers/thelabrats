# Report format

One report, one section per league, ordered as in `config/leagues.yaml`.
Written for a person reading on a phone over coffee: lead with the actions,
evidence in one line each, no filler. Slack gets mrkdwn; email gets simple
HTML (headings, tables, no images).

## Lede (once, at the top)

- Week number and date range just completed.
- 2–4 sentences of league-wide NFL context that actually drives this week's
  decisions (injuries, depth-chart takeovers, breakouts). Not a recap of every
  game.
- If any data source or league fetch failed: an honest one-line note here,
  e.g. "⚠️ Yahoo API was down — Main Event section is from last known data."

## Per-league section

### {League name} ({platform})

**Record & standing** — one line: record, rank, points-for trend.

**1. Housekeeping (do these first)**
- IR moves: who to slide to IR and who that opens room for. Only players the
  league's rules actually allow in the slot.
- Bye/injury lineup warnings for the coming week.

**2. Waiver claims — ranked**

| # | Add | Pos | Drop | Bid / Priority | Why |
| - | --- | --- | --- | --- | --- |

- "Why" = one line of evidence: usage/depth-chart fact, article consensus
  ("3 of 4 outlets"), Sleeper trend rank, and the roster gap it fills.
- Bid guidance respects the league's FAAB budget (state remaining budget) or
  waiver priority position and whether it's worth burning.
- If no claim is worth it this week, say exactly that — an empty table with
  "hold your priority/budget" is a valid recommendation.

**3. Morning-after watch list**
Priority-ordered names to grab as free agents if they clear waivers, each with
a half-line reason. These are the "first thing Wednesday morning" players.

**4. Trade ideas** *(only when a realistic one exists)*
- Offer: {my player(s)} for {their player(s)} with {team/manager}.
- Reasoning: my surplus ↔ their need, and why it improves my starting lineup.
- Frame as ideas to consider, never as done deals.

## Footer

- Data timestamps: when rosters/waivers were pulled.
- Sources consulted (outlet names for the articles).
- Next scheduled report date.

# Where the recap's numbers come from

`scripts/gather.ts <week>` is the only source of league facts. Run it, read
it, write from it. It is read-only and safe to run repeatedly.

```bash
set -a; . ./.env.local; set +a
npx tsx .claude/skills/fantasy-weekly-recap/scripts/gather.ts 1
```

## What it returns, and what each section is for

| Section | Use it for |
| --- | --- |
| **MATCHUPS** | The scoreboard block. Margins are pre-computed — a 2.6-point loss is a story, a 69-point loss is a different one. |
| **AWARDS** | The spine of the league half. The engine already decided who the Bench Bum is; the recap dramatises that verdict rather than re-litigating it. |
| **POSITION KINGS** | Quick hits and nicknames. Also the cheapest way to name managers the awards missed. |
| **TOP STARTERS** | Cross-reference against NFL news. A 41-point quarterback is a real-world story that happened to land on somebody's roster. |
| **BUSTS** | Projected 12+, delivered under 6. Where most of the comedy is. |
| **BENCH SCORES OVER 15** | The "what were you thinking" list. IR is excluded — a player who could not legally be started is not a decision anybody made. |
| **ROSTER MOVES** | Waiver heroics and panic. Lineup swaps are excluded here; they are counted by The Galaxy Brain but would drown this list. |

## Rules

- **Never contradict a published award.** If the page says Doug's lineup was
  optimal, the recap does not call him careless. Those numbers are settled and
  the league can see them.
- **Projections are the yardstick.** "Scored 5.1" means nothing on its own;
  "scored 5.1 against a 22.2 projection" is the joke. Always reach for the pair.
- **Names, not team names.** First names throughout, from the `franchises`
  join. Team names are for the scoreboard block.
- The site is the receipt. Link to `/awards`, `/standings` and `/transactions`
  rather than reprinting them — the recap is the story, not the database.

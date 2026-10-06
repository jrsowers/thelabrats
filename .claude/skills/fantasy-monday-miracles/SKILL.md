---
name: fantasy-monday-miracles
description: Write and publish Monday Night Miracles — the Monday-morning preview of the Lab Rats week still in flight, naming who needs a miracle to come back, who needs one to hold on, and whose season pivots on tonight's game. Bylined by Dr. Bunsen Burner. Use on a Monday, or when asked for "Monday Night Miracles", "the Monday post", or "who needs a miracle".
---

# Monday Night Miracles

A 900–1,400 word Monday-morning dispatch on a week that is **not finished**.
Published to `/recaps` under the `miracles` series, bylined by Dr. Bunsen
Burner. Shorter and faster than the Tuesday recap — this one exists to be read
before kickoff, not after.

**Read `../fantasy-weekly-recap/references/voice.md` first.** Same character,
same boundaries, same humor calibration. Only the tense changes, and that
change is the whole job.

## The one rule that governs everything

**NOTHING HAS HAPPENED YET.** Every verb is present or future tense. Nobody
"won", nobody "lost", nobody "blew it". They *lead*, they *trail*, they *need*.

A Monday post written in the past tense is wrong by Tuesday night, and it is
wrong in the most embarrassing available way: it called a result that had not
happened. If a sentence would look stupid if the underdog wins, rewrite it.

Predictions are welcome and should be loud — but they are predictions, and
Burner has to be seen to be sticking his neck out rather than reporting.

## Process

### 1. Gather the week in flight

```bash
set -a; . ./.env.local; set +a
npx tsx .claude/skills/fantasy-monday-miracles/scripts/gather.ts [week]
```

Defaults to the current matchup period. It prints, per matchup: current score,
margin, who still has players on the field, exactly who those players are with
their projections, and a verdict on whether the leader is safe. Plus records
going in, so the stakes of each swing are visible.

Two traps it already handles, and you should understand both before trusting
any number:

- **`actual_points IS NULL` means "no stat line", not "zero".** A player who
  suited up and did nothing scores 0.00. Confusing them credits managers with
  points that have already failed to happen.
- **A null stat line is not enough on its own.** A backup QB who never took the
  field, or a kicker who was cut, also reads null after his team has played.
  The script only counts a player as pending if his NFL TEAM has not kicked
  off. The first run without that filter gave one manager 24.1 points still to
  come when the true figure was 16.1, and handed three managers defenses whose
  games had finished hours earlier.
- **If ESPN's team projection disagrees with the player sum, STOP.** The
  script checks this and shouts. It means the stored roster is stale — almost
  always a dropped player whose row was never pruned — and everything this post
  is about is then wrong. Re-run the roster sync for the week and gather again.
  Week 3 shipped saying James still had a kicker to come; he had dropped that
  kicker five days earlier.

### 2. Research the NFL week so far, and tonight's game

**`gather.ts` prints LEAGUE NOTES first when there are any.** Those are human
observations from `src/content/league-notes.ts` — things a database query and a
news search both structurally cannot find, because a box score records that a
touchdown was not scored and says nothing about a quarterback deciding not to
score it. Week 3's was exactly that: Trevor Lawrence kneeling at the one-yard
line and handing six points to a rival manager's flex.

Read them before searching, use the verified ones, and **research any note
marked NOT VERIFIED before it goes anywhere near print** — they are
recollections, and recollections are wrong sometimes.

⚠️ **NEVER NAME THE SOURCE OF A NOTE IN THE COPY.** A note's `source` field is
provenance for the writer, not a line in the recap. Week 4 shipped "James tells
me he was trailing by less than half a point" and "There is a wrinkle, and
James raised it himself", which turns a lab journal into an interview and makes
a manager look like he is briefing his own coverage. James: *"I don't want it
to sound like I'm telling you what to write. These recaps are supposed to be
your observations, like a Lab Journal."*

Verify the note, then state the fact in Burner's own voice, as something
observed. If a note cannot be stated without crediting whoever supplied it, it
is not verified enough to print.


Search for it. **Never state an NFL fact from memory** — the model's training
data is behind the season, and this is the same rule the recap skill carries
for the same reason.

You need:
- Who plays tonight, where, and what time
- Both teams' records and what is at stake for them
- Any injury or inactive that changes what a rostered player is likely to do

The Monday game identifies itself from the data: the NFL teams with zero
rostered starters holding a stat line are the ones yet to play. Confirm it with
a search rather than assuming.

### 3. Find the stories

In rough order of how much anybody cares:

1. **A leader with nobody left.** The purest form of the thing: they cannot
   score another point and can only be caught. Name the exact number the
   opponent's remaining player has to stay under.
2. **An undefeated or top-of-table team losing.** Upset alert. Punch up.
3. **A knife-edge game where both sides still have players.**
4. **A team that needs a specific absurd outcome** — a defense to outscore its
   own offense, a kicker to have the game of his life.
5. **The already-decided games**, briefly, as contrast and cruelty.

Convert every deficit into **the concrete thing that has to happen**: "Evan
needs Jalen Hurts held under 3.3 points" beats "Evan is narrowly ahead".

### 4. Write it

```
Cold open       2–4 lines. How many managers are still alive and why that is funny.
THE BOARD       Every matchup, current score, who is still breathing.
2–4 miracles    One heading each. The desperate cases, in detail.
The formalities The decided games, quickly.
Sign-off        Burner's send-off. The byline card renders itself — do not type one.
```

Target **900–1,400 words.** This is a dispatch, not the recap. If it runs past
1,500, cut a miracle.

### 5. Cover image

Higgsfield `generate_image`, `soul_cinematic`, 16:9, `quality: "2k"`, params
nested inside `params`. House look and the two hard-won rules — silhouettes not
faces, and remove the objects that would carry text — are in
`../fantasy-weekly-recap/references/image-prompt.md`.

The series has its own visual register: **desperation and waiting**, where the
recap's is aftermath. A kneeling figure, an empty floodlit field, a lone
sideline. Save to `public/recaps/week-N-miracles.jpg`.

### 6. Publish

Add to `src/content/recaps.ts` with `series: 'miracles'`, `published: true`,
`author: BURNER` and `coverImage`. Then:

```bash
npx tsx .claude/skills/fantasy-weekly-recap/scripts/check-pronouns.ts <week>
npm test && npx tsc --noEmit && npm run build && npm run test:responsive
```

## Hard rules

- **American spelling.** Defense, offense, color, gray, judgment, while. The
  list is `src/lib/style/american-english.ts` and a test fails the build on any
  published copy that breaks it. "defence" has reached the league twice.

- **Present tense. No result is called.** See above; it is the whole point.
- **The roast boundary is SOUL.md's.** Managers for decisions, never bodies.
  An injury to a player still to come is reported flat — it changes the odds
  and that is all it does.
- **Each manager's own pronouns**, from `src/content/managers.ts`.
- **Never invent a stat.** Every number from `gather.ts` or a searched source.
- **Do not contradict the awards or the standings.** They are published.
- **This is groundwork for Tuesday.** The recap will revisit these matchups
  knowing the answer, so leave it something to collect on — name what you
  expect, so Tuesday can say whether you were right.

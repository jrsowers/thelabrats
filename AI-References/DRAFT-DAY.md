# DRAFT-DAY.md
### The roast engine: what it does, why it works that way, how to run it

> Written 2026-09-01, two days before the 2026 draft.
> Companion docs: `SOUL.md` (the boundary), `ROAST-VOICE.md` (the voice),
> `DECISIONS.md` (the log).

---

## What this is

A pipeline that watches the ESPN draft, decides which picks deserve a comment,
and has Claude write it. Three surfaces:

| Route | Job | Indexed |
| --- | --- | --- |
| `/draft` | Pick-by-pick feed, live then permanent | No |
| `/draft/recap` | League-wide feature + 12 report cards | No |
| `/draft/recap/[name]` | One manager's report card | No |

Everything roast-related is `robots: noindex`. The jokes name real NFL players
and the site carries real people's names. Link-shareable, not searchable.

---

## The pipeline

```
ESPN mDraftDetail  →  analyze  →  schedule  →  write  →  pages
   (every 15s)        (facts)     (which +     (Claude)
                                   theme)
```

| Module | Responsibility |
| --- | --- |
| `lib/draft/board.ts` | Builds THIS league's board (value over replacement) |
| `lib/draft/analyze.ts` | Every fact a roast may cite. Deterministic, tested |
| `lib/draft/themes.ts` | Which of 12 angles a pick can honestly support |
| `lib/draft/schedule.ts` | Which picks get roasted, with which theme |
| `lib/draft/writer.ts` | Claude call. Phrases facts, never derives them |
| `lib/draft/validate.ts` | The checks. Status invention, style, craft rules |
| `lib/draft/badges.ts` | Verdict badges, assigned per manager |
| `lib/draft/dossier.ts` | Verified news — the only non-fact-sheet source |
| `lib/draft/roast.ts` | Fact sheet + deterministic template fallback |

### The voice

Two documents load into every prompt, in order:

1. **`ROAST-WRITER.md`** — the craft spec. Joke engines, construction, rhythm,
   diction, freshness, the quality test. Supplied by James, and it is better
   than what preceded it. It governs HOW to write.
2. **`ROAST-BIBLE.md`** — the league layer. Who may be roasted, what this format
   actually is, the player-then-roster-then-numbers hierarchy, accuracy. It
   covers only what the craft spec cannot know.

Where they overlap, the craft spec wins.

**Rules that can be checked are checked.** An instruction-only rule has slipped
five separate times on this project: invented injury status, British spelling,
the grade restated in prose, a gendered collective in a headline, and roasts
running 58 words against a 45-word cap. `validate.ts` now enforces the
mechanical ones, and a failure drives one targeted rewrite rather than a
fallback — a stiff joke is still a joke.

**The LLM computes nothing.** Every number it can cite already exists on
`PickAnalysis` and is unit-tested. This is the same contract the awards engine
works under, and it is what stops a bot inventing a reach that never happened.

---

## Decisions, and why

### The board is ours, not ESPN's

ESPN publishes a generic `SUPERFLEX` rank. This league is not generic:

- **6-point passing touchdowns** (ESPN's default is 4)
- **0.5 PPR**, not full
- 15 roster slots, 15 rounds, **only 5 bench spots**

ESPN also publishes season projections *already scored by this league's rules*.
Verified by hand: Josh Allen's `appliedTotal` of 435.7 only reconciles with
6-point passing TDs. So the board is built from those projections as **value
over replacement**, with replacement level set by what this league actually
starts — roughly two QBs per team once the OP slot counts.

It disagrees with ESPN's generic board by a **median of 12 slots**. Derrick
Henry is ESPN #39 and **#9 here**.

Ranking by raw projected points would just list quarterbacks. VOR is what makes
a 300-point QB and a 220-point RB comparable.

### Kickers and defenses are buried

Raw VOR put the best defense at **#57** and the best kicker at **#69**, because
a kicker genuinely projects ~165 points. Arithmetically true, useless as a
board — those projections are near-random year to year, which is why every
mainstream board buries them and why taking one early is a running joke.
Ranked inline, the bot would have called a round-5 defense sound.

### "Reach" means players left on the board

Not rank-minus-pick. By round 9 everyone ranked under 100 is gone, so
rank-minus-pick makes *every* late pick look like a massive reach. **How many
better players were still available** means the same thing in round 1 and
round 15.

### National ADP is the punchline, never the yardstick

Standard ADP does not price a second starting QB. Josh Allen's ADP is 19.4;
measuring against it flags every correct superflex QB pick as a reach. ADP
survives only as *"the rest of America had him going 83rd."*

Corollary: a pick is only **against the grain** if it is early on *both* boards.
Correct-but-unusual is following the crowd in this format.

### Cadence and fairness

| Rule | Value | Why |
| --- | --- | --- |
| Total | ~60 of 180 | One per three picks |
| Per round | 4 target, 2–6 flex | A dead round should not be forced to produce four |
| Per manager | min 3, max 8 | Nobody ignored, nobody pile-driven |
| Per theme | ~15%, hard 20% | One angle on repeat reads as a broken bot |
| Back-to-back | never same theme | Excluded outright |

**Being ignored is worse than being roasted.** Every manager is guaranteed at
least three comments even if they drafted cleanly.

### Twelve themes

Cost to value · Positional imbalance · News cycle · Against the grain ·
Following the crowd · Copium · Handcuff · Stacking · Nostalgia · Superflex
malpractice · The robot · Backhanded compliment

A theme is only eligible when the facts support it. `NEWS_CYCLE` requires a
dossier entry, so the writer can never invent a headline.

*Not built:* **the reunion tour** (re-drafting the guy who burned you last
year). Needs 2025 rosters, which lived on Yahoo. Available next season.

### The editorial boundary

`SOUL.md` has two tiers.

- **Managers** — decisions only, never their lives.
- **NFL players** — public figures. Their choices, on and off the field, are
  fair game. Target the choice, or the institution that tolerated it. **Never
  the people harmed by it.**

Accuracy is part of taste: *alleged* stays *alleged*. A roast built on a wrong
fact is not edgy, it is wrong.

Tier-2 dossier entries are listed by `tier2Players()` for review before they
ship. Currently three: Keenan Allen, Miles Sanders, Deshaun Watson.

### Model

`claude-opus-5`, via a **forced tool call** rather than raw JSON. Opus emits
thinking blocks whose tokens count against `max_tokens`; a generous-looking
budget still truncated the array mid-string and cost whole batches. A tool call
cannot be malformed.

Batched ~10 picks per call. The model sees its own recent roasts, which is the
only reliable way to stop it opening six in a row the same way. ~11s per batch
of 6, comfortably inside a 60-second pick.

Falls back to `templateRoast` on any failure. A repetitive line beats a hole in
the feed while twelve people are watching.

---

## Running it

```bash
# Thursday morning — refresh the board with current ADP
npx tsx scripts/snapshot-board.ts

# ~12:55 PM — start the live runner and leave it running
npx tsx scripts/draft-live.ts

#   --dry     no Claude calls, template text only (rehearsal)
#   --replay  simulate the whole draft from the fixture

# Regenerate sample content (pre-draft only)
npx tsx scripts/generate-sample-feed.ts
npx tsx scripts/generate-sample-recap.ts

# Verify
npm test                  # 165 unit tests
npm run test:responsive   # 62 checks, every route x 5 widths
```

Nothing touches the network during the draft except the ESPN poll. The board
and the dossier are on disk by then, deliberately.

---

## Bugs worth remembering

Each of these would have been visible to twelve people in real time.

1. **`reachSlots` was inverted.** `pick - rank` reads a rank-40 player taken
   first overall as *value*. Every reach announced as a steal, all draft. The
   first tests passed because the expectations were derived from the
   implementation instead of from meaning.

2. **`playerId > 0` dropped every D/ST.** ESPN gives defenses negative ids
   (Seahawks are `-16026`) while an unmade pick is exactly `-1`. Twelve picks
   and the early-defense flag would have vanished silently.

3. **Every roast landed on the wrong manager.** The fact sheet exposed `pick`
   (overall number) while the prompt asked for `{"pick": N}` meaning batch
   position. The model used the overall numbers; the code read them as
   positions. Jay's Jonathan Taylor pick was roasted as Keshia drafting Josh
   Allen. Ids are now unambiguous and asserted.

4. **The model extrapolated a fact forward.** Given "suffered a groin injury on
   8 August", it wrote "and he is still listed questionable" — a new claim
   about today. `ROAST-VOICE.md` now forbids inferring forward from the
   dossier.

5. **A finished draft opened on round 15.** Newest-first is right live and
   wrong afterwards.

6. **The runner resumed from the SAMPLE feed.** Roasts are keyed by overall
   pick number, so on draft day it would have attached the simulated draft's
   roast for pick 1 to whoever really went 1.01. It now refuses to resume from
   anything not marked `sample: false`.

The pattern: **four of the five were only findable by running it.** Reading the
code would not have caught a single one of the attribution or ordering bugs.

---

## Still open

See `MEMORY.md` for the live list. As of writing:

- Tier-2 dossier entries are awaiting James's review
- `ROBBERY` badge is untested: it needs a 20-slot fall and the simulated draft's
  largest is 13
- Yahoo 2025 draft export would unlock the reunion-tour theme next season

**Dropped by James, 2026-09-02:** draft superlatives. Enough features.

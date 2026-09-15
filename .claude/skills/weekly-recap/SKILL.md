---
name: weekly-recap
description: Write and publish the Lab Rats weekly recap — a Chris Berman-style rundown of the NFL week tied back to the league's own carnage, bylined by Dr. Bunsen Blitzer, with a generated featured image. Use after a week's awards publish (Tuesday morning), or when asked for "the recap", "this week's recap", or "the newsletter".
---

# The Weekly Recap

A 7–10 minute read that gives twelve managers the NFL week that mattered and
then makes it personal. Published to `/recaps`, bylined by Dr. Bunsen Blitzer.

**Read `references/voice.md` before writing a word.** It is the craft spec;
this file is the process.

## The one rule that governs everything

**Every NFL beat must land on somebody in this league.** A recap that reports
the Ravens beating the Colts is a news summary anybody can get elsewhere. A
recap that reports Derrick Henry going for 144 and three scores *and that
Chenell is the only manager who owns him* is the reason this exists.

If an NFL story does not touch a roster in this league, cut it — however good
the joke is. The league is the point; the NFL is the setup.

## Process

### 1. Establish the week

```bash
set -a; . ./.env.local; set +a
```

The recap covers the week whose awards were just published. Confirm it is
actually settled before writing — a recap of a half-finished week ages badly
within hours.

### 2. Pull the league's own week

Run `scripts/gather.ts` (see `references/data.md` for the queries it makes).
It returns, for the week:

- every matchup result and margin
- the twelve published awards and the Position Kings strip
- top starters, worst starters against projection, biggest bench scores
- roster moves, and the standings before and after

**Read the awards first.** They have already found the week's stories — the
engine spent its effort deciding who the Bench Bum is so the recap does not
have to. Do not re-derive them, and never contradict them.

### 3. Research the NFL week

Search for the week's results, biggest performances, upsets and injuries.
Then **cross-reference against the roster data from step 2** and keep only what
touches this league.

Prefer, in order:
1. A thing that happened to a player somebody in this league started
2. A thing that happened to a player somebody in this league *benched*
3. A thing that explains an award winner
4. League-wide NFL context that sets up one of the above

⚠️ **Never state a fact about the NFL week from memory.** The model's training
data will be months or years behind the season being recapped. Every score,
stat line and injury goes through a search first.

### 4. Write it

Structure — borrowed from James's own newsletters, not copied:

```
Cold open          2–4 short lines. The week's thesis, stated with violence.
2–4 NFL beats      Bold headline per beat. Score, what happened, who in the
                   league it hit. NOT every game — only the ones that matter here.
THE SCOREBOARD     All six matchups, results and margins.
3–5 league stories One bold heading each. This is the heart of the recap.
Sign-off           Blitzer's send-off. The page renders his byline card
                   automatically, so end on prose — do not type a signature.
```

Target **1,500–2,200 words**. Under 1,500 reads thin; over 2,200 stops being a
7–10 minute read and starts being homework.

### 5. Generate the featured image

Higgsfield, via the `generate_image` MCP tool. Model `soul_cinematic`, 16:9.
The house look is in `references/image-prompt.md` — gritty stadium realism
crossed with arcade-football caricature. Feed it the week's defining visual,
not a generic football scene.

Download the result into `public/recaps/week-N.jpg` and reference it from the
recap entry. **Never hotlink** the generator's URL; those expire.

### 6. Check the pronouns

```bash
npx tsx .claude/skills/weekly-recap/scripts/check-pronouns.ts <week>
```

It prints every gendered pronoun sitting near a manager's name. For each one,
decide: does it refer to a **manager** (rewrite) or an **NFL player** (leave
it)? It is a review aid rather than a test on purpose — see the file's header
for why a strict gate would be worse than none. On week 1 it caught two
violations that were already written.

### 7. Publish

Add an entry to `src/content/recaps.ts` with `published: true`, `author: BLITZER`
and `coverImage`, then run the gate: `npm test`, `npx tsc --noEmit`,
`npm run build`, `npm run test:responsive`. Commit and push.

## Hard rules

- **The roast boundary is SOUL.md's, and it is not negotiable.** Managers are
  roasted for *decisions*. NFL players are roasted for *the choice or the
  institution, never the harm*. A concussion, a torn achilles, an arrest, an
  allegation — those are not material. The fantasy consequence of an injury is
  fair game; the injury is not.
- **This league is gender diverse.** Managers take they/them unless you know
  otherwise. No gendered collectives — no "twelve men enter".
- **Never invent a stat.** Every number comes from the gathered data or a
  searched source. A made-up stat in a recap full of real ones is undetectable
  and corrosive.
- **Every manager should appear across a season, not every week.** Being
  ignored stings worse than being roasted, but forcing all twelve into one
  recap produces a list, not a story. Track who has been named lately.
- **Punch at the powerful.** The manager in first gets it hardest. Somebody
  having a genuinely terrible week gets a lighter touch than somebody winning.

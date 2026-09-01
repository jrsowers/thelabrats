# SOUL.md
### The identity of this product, and how to build it

> Read this before `PRODUCT_SPEC.md` — the spec says *what* to build.
> This says *what it should feel like* and *how to make decisions* when the spec is silent.

---

## What this is

The digital home of one fantasy football league: **The Lab Rats**.

Not a fantasy platform. Not a stats dashboard. ESPN already does roster moves,
waivers, and trades, and it does them fine. This app is the **broadcast booth,
the record book, and the group chat's evidence locker.**

The test: on a Sunday afternoon, does a manager keep this tab open *next to*
ESPN — not instead of it?

---

## Voice

Think **NFL Primetime**, not Bloomberg Terminal.

**The tone is:**
- Confident and declarative. "Miller blew a 94% win probability." Not "Miller's
  win probability declined significantly."
- Specific. Numbers, names, weeks. Never vague praise or vague shade.
- Funny because the facts are funny — never because we added exclamation points.
- Sports-literate. It assumes the reader knows what a flex is.

**The tone is not:**
- Corporate SaaS ("Your weekly performance insights are ready!")
- Cutesy or emoji-laden
- Mean about anything outside of fantasy football

### The roast boundary

There are **two tiers**, and collapsing them is the mistake.

#### Tier 1 — League managers

These are twelve real people, most of whom are friends, and none of whom signed
up to be public figures. We roast their **decisions**, never their **lives**.

| Fair game | Off limits |
| --- | --- |
| Benching a guy who hung 28 | Anyone's job, family, appearance, finances |
| Spending $40 FAAB on a handcuff | Anything someone shared in confidence |
| Losing to the worst team in the league | Real-life misfortune of any kind |
| An eight-week losing streak | Anything that isn't about fantasy football |

If a joke would land badly read aloud at the draft party with everyone's spouse
in the room, it doesn't ship.

#### Tier 2 — NFL players

Different people, different rules. These are public figures being paid publicly
to make choices the entire sport discusses. Their decisions — on the field and
off it — are legitimately part of the conversation, and pretending otherwise
makes the writing toothless and a little dishonest.

**The line: ridicule the CHOICE, or the institution that tolerated it. Never the
people harmed by it.**

| Fair game | Off limits |
| --- | --- |
| Signing with the Colts on Tuesday, a DUI by Friday | Anyone actually hurt in that DUI |
| $250M guaranteed and a starting job despite it all | The substance of what he is accused of |
| The fountain of youth finally running dry at 31 | A career-ending injury, as a punchline |
| A holdout that aged catastrophically | Family, mental health, immigration status |

The test for tier 2: **is the target the decision, or the damage?** "The NFL
guaranteed a quarter of a billion dollars to that" points at the institution.
Anything that invites the reader to enjoy someone's suffering does not ship, no
matter how newsworthy.

Accuracy is part of taste here. Say *alleged* where it is alleged, *charged*
where charged, *convicted* only where convicted. A roast built on a wrong fact
is not edgy, it is just wrong.

---

## Design posture

Sports editorial. Dense, scannable, confident.

- **Scores are the loudest thing on screen.** Everything else supports them.
- Restrained color, used to mean something — live, won, lost, playoff line.
- Never communicate state by color alone (§39).
- Tables are good. Sports fans read tables. Don't hide data in cards to look modern.
- Skeletons, not spinners. Never blank a live scoreboard to refresh it (§37).

**Avoid:** gradients, glassmorphism, giant empty cards, decorative animation,
anything that reads as a generic admin template.

---

## Engineering priority order

From spec §66. When two goods conflict, the higher one wins — no exceptions:

```
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

> A gorgeous playoff bracket with incorrect seeding is a failed feature.
> A hilarious award built on bad lineup data is a failed feature.

---

## Non-negotiables

1. **ESPN is never touched from the browser.** Server-side only, behind
   `/src/lib/espn/`. No component knows an ESPN field name.
2. **The LLM never computes anything.** Standings, seeds, awards, records, and
   metrics are deterministic and tested. The LLM receives structured facts and
   writes prose. That is its entire job.
3. **Never fabricate an ESPN schema.** Inspect the real payload, save a fixture,
   write the parser, document the assumption. Guessing here poisons everything
   downstream.
4. **Secrets stay server-side.** No ESPN cookie, service-role key, or API key
   ever reaches the client bundle, a log line, or Git.
5. **Every ingest is idempotent.** Running a sync twice changes nothing the
   second time.
6. **ESPN going down degrades the app, never breaks it.** Serve last-known-good
   data with an honest "last updated" timestamp.
7. **Nothing is hardcoded to this league's shape.** Not 12 teams, not 6 playoff
   spots, not a 14-week season. Read it from configuration.

---

## When the spec is silent

Decide in this order:

1. **Does it affect data correctness?** Choose the option that is verifiable and
   testable, even if slower to build.
2. **Will this matter in three seasons?** Favor the durable schema over the
   convenient one. Data we don't capture now is gone forever.
3. **Would a league member notice and care?** If no, don't gold-plate it.
4. **Still unclear?** Build it behind a flag, write it down in `DECISIONS.md`,
   and flag it for James — don't stall the milestone.

---

## Definition of done, culturally

The product works when the league argues about something *in the app* instead of
in the group chat — and the app settles it.

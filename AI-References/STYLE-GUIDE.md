# Field Lab — The Lab Rats Design System

**Live version:** [`/style`](https://www.labratsfantasy.com/style) — renders from the real
tokens, so it cannot drift from the app the way a static spec can. When the two
disagree, the live page is right.

**Tokens:** `src/app/globals.css` · **Components:** `src/components/ui/primitives.tsx`

---

## The idea

> **A sports broadcast graphics package, operated by scientists.**
> Precision instruments pointed at chaos.

The league is a Creator Science community called The Lab Rats. That name does the
work: *science* and *football* are usually two different design languages, and the
lab motif is what fuses them. Rigor applied to something gloriously irrational.

Every decision below serves that one sentence.

---

## Where it comes from

Four references, four distinct jobs. Blended rather than copied.

| Reference | What we took | What we left |
| --- | --- | --- |
| **FantasyPros** | The skeleton — persistent dark left rail, dense content right | Its utilitarian blandness; it looks like a tool, not a broadcast |
| **Guillotine Leagues** | The voice — condensed uppercase display type, high-contrast drama, big stat numbers | Its relentless darkness and horror framing; our league is competitive, not cruel |
| **Fantasy Life** | The density — category tags, avatars, tight editorial rhythm, scannable rows | Ad-driven clutter and its busy multi-column grid |
| **Creator Science** | The DNA — electric blue, generous whitespace, the circular seal, scientific restraint | Its softness; it is a newsletter brand, and a scoreboard needs more teeth |

**The blend:** FantasyPros' bones, Guillotine's voice, Fantasy Life's density,
Creator Science's soul.

---

## Color

Restrained by default so that **color always means something**. Signal colors are
reserved for state and never used decoratively.

### Ground
`--bg` `--surface` `--surface-2` `--surface-3` `--border` `--border-strong`

Structure comes from **hairlines, not shadows**. Elevation is reserved for genuine
overlays (modals, popovers). A card is a 1px border and a background shift — nothing more.

### Signal

| Token | Light | Dark | Means |
| --- | --- | --- | --- |
| `--brand` | `#1d4fd8` | `#4d7dff` | Identity, links, active nav, playoff line |
| `--live` | `#0e9f5c` | `#1fd882` | In progress, right now |
| `--win` | `#0e7a49` | `#35e08f` | Victory, positive delta |
| `--loss` | `#cf2222` | `#ff5a5a` | Defeat, negative delta, elimination |
| `--warn` | `#a86500` | `#ffb833` | Provisional, championships |

`--brand` is Creator Science's blue, pushed a few degrees more electric so it holds
up against a scoreboard.

**Never communicate state by color alone** (§39). Every colored state carries a text
label: a live row shows a green bar *and* the word LIVE.

### The dark rail

The left rail stays dark in **both** themes. It reads as chrome rather than content —
the same instinct behind FantasyPros' rail and every broadcast lower-third. It frames
the scores instead of competing with them.

---

## Typography

Three voices, each with one job.

| Voice | Face | Job |
| --- | --- | --- |
| **Display** | Barlow Condensed 700/800, uppercase | The scoreboard. Team names, scores, page titles, section heads |
| **Body** | Geist Sans | The analyst. Explanations, descriptions, prose |
| **Mono** | Geist Mono | The instrument label. Eyebrows, timestamps, IDs, stat captions |

### Scale

```
Display XL   52px / 0.94   page titles
Display L    34px / 0.94   section heads, team names in cards
Score        40px / 0.94   tabular, the loudest thing on screen
Display M    17–26px       row-level team names, tiles
Body         15px / 1.55   prose
Small        13px          secondary
Eyebrow    10.5px          mono, uppercase, 0.14em tracking
```

### The eyebrow

The system's most distinctive element — small, tracked, monospace, muted:

```
WEEK 07 · MATCHUP 03
ROSTER CONSTRUCTION
DECISION COST
```

It reads as a **specimen tag**: something measured and labeled. It's the single
device doing the most work to make football data feel like laboratory data.

### Numbers

**Every number compared against another number uses tabular figures** (`.tnum`).
Scores, records, points-for, margins. Proportional digits make a column of scores
wobble, and a wobbling scoreboard reads as amateur.

---

## Motifs

**Field lines** — a football field behind page headers (`FieldBackdrop`): 5-yard
lines every 56px, heavier 10-yard lines every 112px, two rows of one-yard hash
marks at 32% and 68% height matching a real field's inbound lines, and yard numbers
running 10-20-30-40-50-40-30-20-10 on the 10-yard marks.

Lines are CSS gradients because they tile cleanly at any width. Numbers are real
elements — a gradient cannot draw a 40. At typical content width the pattern spans
roughly one full 100-yard field.

**Tuning notes**, all learned the hard way:

- Hash ticks are 6px tall against 11.2px spacing. At 9px they merged into two
  dashed rules instead of reading as ticks. **Keep the tick shorter than its gap.**
- 10-yard lines need meaningfully more contrast than 5-yard lines, or the pattern
  flattens into plain vertical stripes with no football rhythm.
- Numbers get their **own, lighter token** (`--field-number`). A glyph covers far
  more pixels than a 1px stroke, so matching the line alpha makes numbers shout.
- The whole backdrop carries a left-to-right mask (28% → 100% at 52%) so the page
  title always wins. Text beats texture.
- Judge all of this at **1:1 pixel scale**. Downscaled screenshots hid the merged
  hash marks entirely.

Structure, not decoration. Headers only; never behind data.

**The state bar** — a 3px left edge carrying meaning: green live, blue playoff line,
amber champion, red eliminated. Cheap, scannable, works in a dense list.

**The seal** — Creator Science's circular badge recast as laboratory glassware: a
flask, a wordmark ring, `THE LAB RATS · FANTASY FOOTBALL · EST 2025`. Appears in the
rail and on empty states. Draws the two brands into one mark.

**Member photos** — every matchup row leads with the league member's own face at
36px, circular. Fallback order: member photo → ESPN team logo (rounded square, so
the shape itself signals which you are looking at) → mono abbreviation chip.

Photos are editorial data on `franchises.photo_url` — they belong to the persistent
person, not to one season's team, and no sync may write that column. Source files
are optimized to 256px squares in `public/members` (5.9MB of originals became
223KB) and linked by `npm run seed:photos`, which fails loudly on any name it
cannot match rather than quietly leaving one avatar as a fallback.

A real face beats a stock helmet — it makes the scoreboard read as *this* league
rather than any league.

---

## Layout

```
┌────────────┬──────────────────────────────────────┐
│  RAIL      │  CONTENT                             │
│  224px     │  max-w-6xl                           │
│  dark      │                                      │
│  always    │  header (grid paper)                 │
│            │  ─────────────────────               │
│  6 nav     │  stat tiles                          │
│  items     │  scoreboard rows                     │
│            │  supporting sections                 │
└────────────┴──────────────────────────────────────┘
```

Navigation order is fixed by spec §3.1 and must not be reordered.

**Mobile:** the rail becomes a bottom bar. It never consumes 25–30% of a phone
screen (§3.1).

**Spacing:** 4px base — 4 / 8 / 12 / 16 / 24 / 32 / 48.
**Radius:** 3px tags, 6px controls, 10px cards. Sharp enough to feel like sport,
soft enough not to feel like a spreadsheet.

---

## Principles

1. **Scores are the loudest thing on screen.** Everything else supports them.
2. **Hairlines, not shadows.** Borders carry structure.
3. **Color means state.** Nothing is colored to look nice.
4. **Tables are good.** Fantasy players read tables; don't hide data in cards to
   look modern.
5. **Never blank the scoreboard.** Preserve scores while refreshing; skeletons on
   first load only (§37).
6. **Provisional is always labeled.** A mid-week award never masquerades as final (§22.8).
7. **State is never color alone.** Always a bar *and* a word.

---

## Voice

From `SOUL.md`, applied to interface copy.

**Declarative, specific, sports-literate.** "Miller blew a 94% win probability," not
"Miller's win probability declined significantly."

Empty states say what will fill them:
> *No transactions this week. Moves appear here once the season opens.*

Not: *Nothing to see here!*

Roast **decisions**, never people. If a joke would land badly read aloud at the draft
party with everyone's spouse in the room, it doesn't ship.

---

## Extending this

Before adding a component:

1. Can existing primitives compose into it? Prefer composition.
2. Does it need a new color? Almost certainly not — signal colors are deliberately few.
3. Does it survive both themes and 320px width?
4. Does any state it shows rely on color alone? Fix that first.
5. Add it to `/style` in the same commit, or the guide starts lying.

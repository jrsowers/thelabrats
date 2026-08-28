# Derived Metrics — Definitions

Every metric the app computes itself. Each is a **pure, tested function** in
`/src/lib/` — never inline in a component (§21.7).

If a number appears in the UI and isn't defined here, it isn't finished.

---

## Lineup Efficiency

```
actual starter points / maximum legal lineup points
```

**The trap:** "maximum" is *not* "sum of the best players." It is the
highest-scoring lineup that **satisfies every roster slot constraint** (§26).

A team may have three RBs outscoring their WRs and still not be allowed to start
them. The optimizer must respect QB/RB/RB/WR/WR/TE/FLEX/K/DST (or whatever
`mSettings` reports — never hardcode).

- IR-slotted players are **not** eligible.
- Players eligible for multiple slots make this a real assignment problem, not a
  greedy sort. Greedy gives wrong answers on FLEX-eligible players.
- Implement in `/src/lib/lineup/`. Unit-test with a fixture where greedy fails.

Feeds: Manager of the Week, Bench Boss, Start/Sit Crime, Manager Misery records.

---

## All-Play Record

Each week, pretend every team played every other team.

In a 12-team league, the third-highest score that week goes **9–2**
(beats 9, loses to 2).

Season all-play record reveals whether a team is genuinely good or merely
well-scheduled.

Store it or make it reproducible (§27).

---

## Expected Wins & Luck

```
Expected weekly wins = all-play win percentage that week
Expected season wins = sum of weekly expected wins
Luck differential    = actual wins − expected wins
```

```
Actual wins:    7
Expected wins:  4.9
Luck:          +2.1   ← fortunate
```

Positive = fortunate. Negative = unfortunate.
Feeds: Luckiest Team Alive, Cursed Franchise.

Keep the naive version. It is explainable, and explainability beats
sophistication for a metric whose whole job is settling arguments.

---

## Bench Points

Total points scored by non-starters, excluding IR.

**Not** the same as points *lost* — a benched player only costs you if a legal
lineup existed that would have started him. Bench Boss should use the
optimizer's answer, not raw bench totals, or it will indict managers who did
nothing wrong.

---

## Decision Cost (Start/Sit Crime)

```
benched player points − started player points (same slot)
```

Only meaningful when compared against final margin:

```
Decision cost:  19.3
Final margin:   lost by 4.8   ← this decision lost the matchup
```

Prioritize decisions that **changed the result** (§22.3). A 30-point mistake in
a 60-point blowout is not a crime; it's a footnote.

---

## Win Probability

**Phase 2** (§53). Requires live event tracking.

Until then, do not display a win probability number anywhere. Awards depending
on it — Great Escape, Choke Job, Heartbreaker — stay unimplemented rather than
faked from a crude heuristic. A wrong probability is worse than no probability.

---

## Playoff Seeding

Deterministic engine in `/src/lib/playoffs/` (§21.7). Three modes:

| Mode | Rule |
| --- | --- |
| `OFFICIAL` | Finalized results only |
| `LIVE_IF_ENDED_NOW` | Current live leader treated as the winner |
| `PROJECTED` | ESPN projected final score picks the winner |

Then apply the **commissioner-confirmed** tiebreaker hierarchy — never a guessed
one (§29). The engine must **explain** its result:

```
Team F wins the tiebreaker over Team G
Reason: Points For — 1,284.6 vs 1,269.3
```

If our tiebreakers can't be confirmed to match ESPN, label the whole playoff
picture **"Unofficial"** until validated.

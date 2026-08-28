# Awards Library

Spec §22.8: *"Each award algorithm has a documented formula."* This is that
document. An award ships only when its row here is filled in and tested.

**Rules:**
- Deterministic. Computed from stored data, regenerable at any time.
- ~8–12 shown per week, chosen by interest — not all of them, every week (§22.2).
- An award with no meaningful candidate **does not appear**. No "nobody this week."
- Explanations are assembled from real values. The LLM may restyle prose later;
  it never supplies a number.
- Provisional (mid-week) awards must be visibly labeled as such.

Status: ✅ shipped · 🔨 in progress · ⬜ not started · 🔒 blocked on Phase 2 · ❌ not applicable to this league

---

## Milestone 7 — required for MVP (§51)

| Award | Formula | Status |
| --- | --- | --- |
| **Manager of the Week** | Composite: team score + lineup efficiency + opponent strength | ⬜ |
| **Stud of the Week** | Highest-impact starter — points, weighted by scarcity vs. position baseline | ⬜ |
| **Dud of the Week** | Worst starter *relative to projection*, not lowest raw score | ⬜ |
| **Bench Boss** | Most points left on bench, per optimizer (see METRICS.md) | ⬜ |
| **Start/Sit Crime** | Max decision cost, prioritized by whether it flipped the result | ⬜ |
| **Projection Smasher** | `max(actual − projected)` among starters | ⬜ |
| **Projection Disaster** | `max(projected − actual)` among meaningful starters | ⬜ |
| **Bad Beat** | Highest-scoring **losing** team | ⬜ |
| **Highway Robbery** | Lowest-scoring **winning** team | ⬜ |
| **Photo Finish** | Smallest margin | ⬜ |
| **Public Execution** | Largest margin | ⬜ |
| **Shootout** | Highest combined score | ⬜ |
| **Dumpster Fire** | Lowest combined score | ⬜ |
| **Waiver Wire Wizard** | Best production from a recent waiver/FA add | ⬜ |

---

## Additional library — post-MVP, deterministic

| Award | Formula | Status |
| --- | --- | --- |
| ~~**FAAB Bandit**~~ | ❌ **N/A — league uses traditional waivers, not FAAB** | ❌ |
| ~~**FAAB Arsonist**~~ | ❌ **N/A — league uses traditional waivers, not FAAB** | ❌ |
| **Nostradamus** | Low-projected starter who massively overdelivered | ⬜ |
| **Galaxy Brain** | Unconventional call that worked | ⬜ |
| **Too Cute** | Unconventional call that backfired | ⬜ |
| **Luckiest Team Alive** | Largest positive luck differential | ⬜ |
| **Cursed Franchise** | Largest negative luck differential | ⬜ |
| **Playoff Wrecker** | Result that most damaged another team's seed | ⬜ |
| **Benchwarmer MVP** | Highest-scoring benched player | ⬜ |
| **Waiver Wire Hero** | Best performance by a recent acquisition | ⬜ |
| **One-Man Army** | Largest share of a team's weekly score by one player | ⬜ |
| **David vs. Goliath** | Largest upset vs. pregame projections | ⬜ |
| **Fantasy Football Is Stupid** | Composite absurdity: all-play percentile vs. result, margin, bench points, projection divergence, playoff stakes | ⬜ |

---

## Blocked on Phase 2 event tracking (§53)

Do not fake these with heuristics.

| Award | Needs | Status |
| --- | --- | --- |
| **Great Escape** | Live win probability | 🔒 |
| **Choke Job** | Live win probability | 🔒 |
| **Heartbreaker** | Play-to-fantasy correlation | 🔒 |

---

## Card anatomy (§22.6)

```
START/SIT CRIME OF THE WEEK

Team Miller

Benched:   Player A — 28.7
Started:   Player B —  9.4

Decision cost:  19.3 points
Final margin:   lost by 4.8
```

Name · recipient · primary metric · short explanation · supporting stats.

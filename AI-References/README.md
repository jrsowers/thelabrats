# AI-References

Persistent context for AI coding sessions on this project. Read these before
writing code — they exist so each session doesn't rediscover what the last one
learned.

## Read in this order

| File | What it's for |
| --- | --- |
| **`SOUL.md`** | Product identity, voice, non-negotiables, how to decide when the spec is silent. **Start here.** |
| **`MEMORY.md`** | Current build state, league facts, blockers, open questions, session log. **Update every session.** |
| **`STYLE-GUIDE.md`** | Design system — color, type, motifs, layout, principles. Live version at `/style`. |
| **`ESPN-API.md`** | ESPN v3 API reference — endpoints, views, ID maps, gotchas. Everything marked unverified until confirmed against a real payload. |
| **`METRICS.md`** | Formal definitions of every computed metric. |
| **`AWARDS-LIBRARY.md`** | Award catalog with formulas and ship status. |
| **`DECISIONS.md`** | Why things are the way they are. Append-only. |
| **`CREDENTIALS.md`** | What secrets exist and where they live. **Never contains values.** |

The authoritative product requirements remain
`../Product Spec – The Lab Rats Fantasy League Command Center.md`.
These files support that document; they don't override it.

## Rules

1. **Secrets never enter this folder.** Values live in `.env.local` (gitignored)
   and the Vercel/Supabase dashboards.
2. **Update `MEMORY.md` before ending a session.** Future sessions depend on it.
3. **Log real decisions in `DECISIONS.md`** so they aren't relitigated.
4. **Mark ESPN facts verified only after seeing a real payload** (spec §60).

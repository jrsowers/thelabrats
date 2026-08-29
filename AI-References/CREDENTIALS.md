# Credentials — Tracker

> **No secret values live in this file, ever.** This tracks *what* we need,
> *where* it lives, and *whether it's collected*. Real values go only in
> `.env.local` (gitignored) and the Vercel / Supabase dashboards.
>
> If you ever find a real key in this file, it has leaked — rotate it.

Status: ✅ collected · ⬜ pending · ➖ optional/not yet needed

---

## Supabase

| Variable | Where it goes | Status |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + Vercel | ✅ new-format key |
| `SUPABASE_SECRET_KEY` | `.env.local` + Vercel (**server only**) | ✅ new-format key |
| `SUPABASE_DB_PASSWORD` | `.env.local` (resettable in dashboard) | ✅ |
| `SUPABASE_PROJECT_REF` | `.env.local` (not secret) | ✅ `fgtsewqcluffmcehqvvx` |
| `SUPABASE_ACCESS_TOKEN` | `.env.local` — ⚠️ **account-wide** | ✅ |

⚠️ **The Supabase MCP is BLOCKED** in `.claude/settings.json` (`deny: mcp__supabase`).
It is authenticated to a **different Supabase account** and points at
`jakuypixhizbyacemoxh`. All database work goes through the CLI, which is linked
to `fgtsewqcluffmcehqvvx`.

⚠️ `SUPABASE_ACCESS_TOKEN` is **account-wide** — it reaches every project on the
account, not just this one. Broader blast radius than the project keys. If it
leaks, revoke it at Dashboard > Account > Access Tokens immediately.

---

## ESPN

| Variable | Notes | Status |
| --- | --- | --- |
| `ESPN_LEAGUE_ID` | `793230160` — not secret | ✅ |
| `ESPN_SEASON` | `2026` | ✅ |
| `ESPN_SWID` | ➖ **not needed** — league is public | ➖ |
| `ESPN_S2` | ➖ **not needed** — league is public | ➖ |

Cookies are insurance even on a public league — see `ESPN-API.md`, the
`mTransactions2` note.

**Never:** commit them · prefix with `NEXT_PUBLIC_` · log them · send to browser ·
put them in a screenshot.

---

## Email — Resend

➖ **No longer needed for MVP.** It existed only to send magic links; the app has
no auth. Revisit only for Phase 3 weekly recap emails.

---

## AI — optional, Phase 3

| Variable | Status |
| --- | --- |
| `ANTHROPIC_API_KEY` *or* `OPENAI_API_KEY` | ➖ |
| `AI_MODEL` | ➖ |

Behind a provider interface (§5) — swapping providers must not touch app code.

---

## Vercel

| Variable | Where it goes | Status |
| --- | --- | --- |
| `VERCEL_TOKEN` | `.env.local` only — ⚠️ **account-wide** | ✅ |

Used by the CLI via `--token "$VERCEL_TOKEN"` for env vars, logs, and rollbacks.
Not needed to ship code — `main` auto-deploys via the Git integration.

⚠️ **Account-wide.** Reaches every project on `jamesrsowers-9743s-projects`
(currently `thelabrats` and `hiddenhands`), not just this one. Revoke at
Dashboard > Account Settings > Tokens.

---

## App-generated

| Variable | Notes | Status |
| --- | --- | --- |
| `CRON_SECRET` | generated | ✅ |
| `ADMIN_EMAIL` | James's email | ✅ |
| `NEXT_PUBLIC_APP_URL` | localhost → Vercel URL → custom domain | ⬜ |

---

## Accounts

| Service | Owner | Status |
| --- | --- | --- |
| GitHub repo | `jrsowers/thelabrats` (**public**) | ✅ |
| Supabase project | `The Lab Rats Command Center`, us-east-1, PG17 | ✅ linked |
| Vercel project | `jamesrsowers-9743s-projects/thelabrats` | ✅ |
| Resend | not needed for MVP | ➖ |
| Custom domain | James | ➖ |

---

## Rotation

If a secret is ever exposed:

1. Rotate at the source immediately (Supabase → API settings; Resend → keys;
   ESPN → change password, which invalidates `espn_s2`).
2. Update `.env.local` and Vercel.
3. If it reached Git, treat history as compromised — rotating is mandatory, and
   scrubbing history is not sufficient on its own.

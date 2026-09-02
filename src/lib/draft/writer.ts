import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ScheduledRoast } from './schedule'
import { THEME_ANGLE } from './themes'
import { factSheet, templateRoast } from './roast'
import { validateRoast, checkStyle } from './validate'

/**
 * Turns scheduled picks into roasts.
 *
 * Batched on purpose. Sending several picks in one call lets the model see what
 * it just wrote, which is the only reliable way to stop it opening six roasts
 * in a row the same way — and it costs fewer calls than one-at-a-time.
 *
 * Falls back to templateRoast on any failure. A repetitive line beats a hole in
 * the feed while twelve people are watching.
 */

const MODEL = process.env.AI_MODEL || 'claude-opus-5'
const VOICE_PATH = join(process.cwd(), 'AI-References', 'ROAST-BIBLE.md')

let cachedVoice: string | null = null
function voiceGuide(): string {
  if (cachedVoice === null) {
    try { cachedVoice = readFileSync(VOICE_PATH, 'utf8') } catch { cachedVoice = '' }
  }
  return cachedVoice
}

export interface DossierEntry { player: string; notes: string[] }

export interface WriteOptions {
  /** Verified news, keyed by player name. The ONLY source for news roasts. */
  dossier?: Map<string, DossierEntry>
  /** Roasts already published this draft, so the model can avoid repeating itself. */
  previous?: string[]
  /**
   * Every earlier roast for a given manager, keyed by first name.
   *
   * This is what makes callbacks possible, and callbacks are the difference
   * between a bot people tolerate and one they quote. Passing only the last few
   * roasts globally is not enough: a manager's running bit may have started six
   * picks and four managers ago.
   */
  historyByManager?: Map<string, string[]>
  apiKey?: string
  model?: string
}

export interface WrittenRoast {
  overallPickNumber: number
  text: string
  theme: string
  /** True when the model failed and the deterministic template stood in. */
  fallback: boolean
}

function buildPrompt(batch: ScheduledRoast[], opts: WriteOptions): string {
  const parts: string[] = []

  if (opts.previous?.length) {
    parts.push(
      'ROASTS ALREADY PUBLISHED THIS DRAFT — do not reuse their openings, ' +
      'structures or jokes:\n' +
      opts.previous.slice(-8).map((r) => `- ${r}`).join('\n'),
    )
  }

  parts.push(
    `Write ${batch.length} roast${batch.length === 1 ? '' : 's'}, one per pick below.\n\n` +
    'WHAT THE JOKE IS ABOUT, in order:\n' +
    '  1. THE PLAYER — read playerStory. Old, unproven, hurt, in trouble, never ' +
    'actually done it. This is where the joke usually is.\n' +
    '  2. THE ROSTER — read rosterProblems. One QB in a format that starts two, ' +
    'three TEs for one slot, a kicker eight rounds early.\n' +
    '  3. THE NUMBERS — last, and rarely. At most ONE, and only if the number ' +
    'itself is absurd. NEVER open a roast with a rank, an ADP or a slot count.',
  )

  // Identified by overallPickNumber, never by batch position. The fact sheet
  // also carries a pick number, and an earlier version asked for {"pick": N}
  // meaning "Nth in this batch" — the model reasonably used the overall numbers
  // instead and every roast landed on the wrong manager.
  for (const s of batch) {
    const facts = factSheet(s.pick)
    const news = opts.dossier?.get(s.pick.player.name)
    const history = opts.historyByManager?.get(s.pick.team.managerFirst) ?? []
    parts.push(
      `\n--- PICK ID ${s.pick.overallPickNumber} ` +
      `(${s.pick.team.managerFirst} selects ${s.pick.player.name}) ---\n` +
      `ASSIGNED THEME: ${s.theme} — ${THEME_ANGLE[s.theme]}\n` +
      `FACTS (the only numbers you may cite):\n` +
      Object.entries(facts).map(([k, v]) => `  ${k}: ${v}`).join('\n') +
      (history.length
        ? `\nEARLIER ROASTS OF ${s.pick.team.managerFirst.toUpperCase()} — if a bit is ` +
          `already running, ESCALATE it rather than restating it. If nothing is ` +
          `running and this pick suggests one, start it:\n` +
          history.slice(-4).map((h) => `  - ${h}`).join('\n')
        : '') +
      (news ? `\nVERIFIED NEWS — the only news you may cite, and you may NOT ` +
        `extrapolate it forward. Report what it says happened; say nothing ` +
        `about the player's status today unless a note states it:\n` +
        news.notes.map((n) => `  - ${n}`).join('\n') : ''),
    )
  }

  parts.push(
    '\nReturn ONLY a JSON array, one object per pick, using the PICK ID exactly ' +
    'as given above:\n[{"id": <PICK ID>, "roast": "..."}]\n' +
    `Expected ids: ${batch.map((s) => s.pick.overallPickNumber).join(', ')}. ` +
    'No preamble, no markdown fence.',
  )
  return parts.join('\n')
}

/** One model call. Returns roast text keyed by overall pick number. */
async function generate(
  batch: ScheduledRoast[], opts: WriteOptions, apiKey: string, extra?: string,
): Promise<Map<number, string>> {
  const client = new Anthropic({ apiKey })

  // Structured output via a forced tool call. Asking for raw JSON in a text
  // block is fragile: Opus emits thinking blocks whose tokens count against
  // max_tokens, so a generous-looking budget still truncated the array
  // mid-string and cost the whole batch. A tool call cannot be malformed.
  const res = await client.messages.create({
    model: opts.model ?? MODEL,
    max_tokens: 1200 + 400 * batch.length,
    system: `${voiceGuide()}\n\nYou are writing roasts for a live fantasy football draft feed.`,
    tools: [{
      name: 'submit_roasts',
      description: 'Submit one roast per pick.',
      input_schema: {
        type: 'object',
        properties: {
          roasts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'The PICK ID exactly as given.' },
                roast: { type: 'string', description: '2-3 sentences. Contractions. No emoji.' },
              },
              required: ['id', 'roast'],
            },
          },
        },
        required: ['roasts'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_roasts' },
    messages: [{
      role: 'user',
      content: buildPrompt(batch, opts) + (extra ? `\n\n${extra}` : ''),
    }],
  })

  const call = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_roasts',
  )
  const parsed = (call?.input as { roasts?: { id: number; roast: string }[] })?.roasts ?? []
  return new Map(parsed.map((p) => [Number(p.id), (p.roast ?? '').trim()]))
}

export async function writeRoasts(
  batch: ScheduledRoast[], opts: WriteOptions = {},
): Promise<WrittenRoast[]> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY
  const fallbackAll = () => batch.map((s) => ({
    overallPickNumber: s.pick.overallPickNumber,
    text: templateRoast(s.pick),
    theme: s.theme,
    fallback: true,
  }))

  if (!apiKey || batch.length === 0) return fallbackAll()

  try {
    let byId = await generate(batch, opts, apiKey)

    // Style problems get ONE rewrite, with the specific complaint attached.
    // Stiff prose is still a joke, so this never falls back — unlike an
    // invented injury, which does.
    const stiff = batch
      .map((s) => ({ s, text: byId.get(s.pick.overallPickNumber) }))
      .map(({ s, text }) => ({ s, text, style: text ? checkStyle(text) : { ok: true, notes: [] } }))
      .filter((x) => !x.style.ok)

    if (stiff.length > 0) {
      const complaint =
        'REWRITE REQUIRED. These read as written prose, not speech. Fix ONLY the ' +
        'language; keep the joke:\n' +
        stiff.map((x) =>
          `  PICK ID ${x.s.pick.overallPickNumber}: ${x.style.notes.join('; ')}`).join('\n')
      try {
        const retry = await generate(stiff.map((x) => x.s), opts, apiKey, complaint)
        for (const [id, text] of retry) {
          // Keep the rewrite only if it actually fixed the problem.
          if (text && checkStyle(text).ok) byId.set(id, text)
        }
      } catch {
        // A failed rewrite is not worth losing the batch over.
      }
    }

    return batch.map((s) => {
      let roast = byId.get(s.pick.overallPickNumber)?.trim()

      // Invented status claims are rejected outright. A written rule against
      // this already failed twice in sixty roasts; losing one joke beats
      // asserting a real player's medical status on a public page.
      if (roast) {
        const check = validateRoast(roast, opts.dossier?.get(s.pick.player.name))
        if (!check.ok) {
          console.warn(`[writer] pick ${s.pick.overallPickNumber} rejected: ${check.reason}`)
          roast = undefined
        }
      }

      return roast
        ? { overallPickNumber: s.pick.overallPickNumber, text: roast, theme: s.theme, fallback: false }
        : { overallPickNumber: s.pick.overallPickNumber, text: templateRoast(s.pick), theme: s.theme, fallback: true }
    })
  } catch (err) {
    console.error('[writer] generation failed, using templates:', (err as Error).message)
    return fallbackAll()
  }
}

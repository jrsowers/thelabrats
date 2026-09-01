import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ScheduledRoast } from './schedule'
import { THEME_ANGLE } from './themes'
import { factSheet, templateRoast } from './roast'

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
const VOICE_PATH = join(process.cwd(), 'AI-References', 'ROAST-VOICE.md')

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

  parts.push(`Write ${batch.length} roast${batch.length === 1 ? '' : 's'}, one per pick below.`)

  // Identified by overallPickNumber, never by batch position. The fact sheet
  // also carries a pick number, and an earlier version asked for {"pick": N}
  // meaning "Nth in this batch" — the model reasonably used the overall numbers
  // instead and every roast landed on the wrong manager.
  for (const s of batch) {
    const facts = factSheet(s.pick)
    const news = opts.dossier?.get(s.pick.player.name)
    parts.push(
      `\n--- PICK ID ${s.pick.overallPickNumber} ` +
      `(${s.pick.team.managerFirst} selects ${s.pick.player.name}) ---\n` +
      `ASSIGNED THEME: ${s.theme} — ${THEME_ANGLE[s.theme]}\n` +
      `FACTS (the only numbers you may cite):\n` +
      Object.entries(facts).map(([k, v]) => `  ${k}: ${v}`).join('\n') +
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
    const client = new Anthropic({ apiKey })

    // Structured output via a forced tool call. Asking for raw JSON in the text
    // block is fragile: Opus emits thinking blocks whose tokens count against
    // max_tokens, so a generous-looking budget still truncated the array
    // mid-string and cost the whole batch. A tool call cannot be malformed.
    const res = await client.messages.create({
      model: opts.model ?? MODEL,
      // Must cover thinking AND the roasts themselves.
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
                  roast: { type: 'string', description: '2-3 sentences. No emoji.' },
                },
                required: ['id', 'roast'],
              },
            },
          },
          required: ['roasts'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_roasts' },
      messages: [{ role: 'user', content: buildPrompt(batch, opts) }],
    })

    const call = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_roasts',
    )
    const parsed = (call?.input as { roasts?: { id: number; roast: string }[] })?.roasts ?? []

    const byId = new Map(parsed.map((p) => [Number(p.id), p.roast]))
    return batch.map((s) => {
      const roast = byId.get(s.pick.overallPickNumber)?.trim()
      return roast
        ? { overallPickNumber: s.pick.overallPickNumber, text: roast, theme: s.theme, fallback: false }
        : { overallPickNumber: s.pick.overallPickNumber, text: templateRoast(s.pick), theme: s.theme, fallback: true }
    })
  } catch (err) {
    console.error('[writer] generation failed, using templates:', (err as Error).message)
    return fallbackAll()
  }
}

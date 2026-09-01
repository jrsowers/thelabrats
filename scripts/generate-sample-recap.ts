/**
 * Generates SAMPLE recap content: one league-wide feature plus a report card
 * per team. Everything is labelled sample and replaced after the real draft.
 *
 *   npx tsx scripts/generate-sample-recap.ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { getDraftFeed, picksByTeam, slugFor } from '../src/lib/draft/feed-data'

const MODEL = process.env.AI_MODEL || 'claude-opus-5'
const voice = readFileSync('AI-References/ROAST-VOICE.md', 'utf8')

const SYSTEM = `${voice}

You are writing the draft recap for The Lab Rats, a 12-team superflex league.
This is longer-form than the live feed: an ESPN-style news story, not a text.
Same voice, same boundaries, same rule that every fact must come from the data
you are given.

EVERY TEAM RECEIVES THE GRADE "F". That is the running joke of the whole page —
the analysis is genuine and rigorous, the grade is immovable. Never explain the
joke, never award a different grade, never hedge toward a real grade.`

async function main() {
  const feed = getDraftFeed()
  const byTeam = picksByTeam(feed.picks)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const teamSummaries = [...byTeam.entries()].map(([teamId, picks]) => ({
    teamId,
    manager: picks[0].manager,
    teamName: picks[0].teamName,
    slug: slugFor(picks[0].manager),
    picks: picks.map((p) => `R${p.round}.${String(p.roundPick).padStart(2, '0')} ${p.player} (${p.position}, rank ${p.leagueRank}, ${p.betterAvailable} better available)`),
    roasts: picks.filter((p) => p.roast).map((p) => p.roast!.text),
  }))

  const context = teamSummaries.map((t) =>
    `### ${t.teamName} — ${t.manager}\n${t.picks.join('\n')}`).join('\n\n')

  console.log('generating feature article...')
  const feature = await client.messages.create({
    model: MODEL, max_tokens: 4000, system: SYSTEM,
    tools: [{
      name: 'submit_feature', description: 'The league-wide draft recap.',
      input_schema: { type: 'object', properties: {
        headline: { type: 'string', description: 'Punchy, 3-8 words, no colon.' },
        standfirst: { type: 'string', description: 'One sentence under the headline.' },
        body: { type: 'array', items: { type: 'string' }, description: '6-9 paragraphs.' },
      }, required: ['headline', 'standfirst', 'body'] },
    }],
    tool_choice: { type: 'tool', name: 'submit_feature' },
    messages: [{ role: 'user', content:
`Write the league-wide draft recap as ONE CONTINUOUS STORY about the draft.

It must NOT be twelve paragraphs each summarising one manager, and it must NOT
state a grade for anyone — the report cards beneath this article do that, and
saying it here spoils them.

Write about the DRAFT: what the room did collectively, the runs, the trends,
the two or three moments that actually mattered, the shape of the board when
it broke. Name managers where they serve the story, not to give everyone a
turn. Some managers should not appear at all.

${context}` }],
  })
  const f = (feature.content.find((b) => b.type === 'tool_use') as { input: Record<string, unknown> } | undefined)?.input

  console.log('generating 12 team report cards...')
  const cards = await client.messages.create({
    model: MODEL, max_tokens: 8000, system: SYSTEM,
    tools: [{
      name: 'submit_cards', description: 'One report card per team.',
      input_schema: { type: 'object', properties: {
        cards: { type: 'array', items: { type: 'object', properties: {
          manager: { type: 'string' },
          verdict: { type: 'string', description: 'Punchy 3-7 word summary of the draft.' },
          teaser: { type: 'string', description: 'One sentence for the tile. Under 25 words.' },
          body: { type: 'array', items: { type: 'string' }, description: '3-4 paragraphs.' },
        }, required: ['manager', 'verdict', 'teaser', 'body'] } },
      }, required: ['cards'] },
    }],
    tool_choice: { type: 'tool', name: 'submit_cards' },
    messages: [{ role: 'user', content: `Write a report card for each of the 12 teams.\n\n${context}` }],
  })
  const c = (cards.content.find((b) => b.type === 'tool_use') as { input: { cards?: Record<string, unknown>[] } } | undefined)?.input?.cards ?? []

  const bySlugManager = new Map(teamSummaries.map((t) => [t.manager, t]))
  writeFileSync('fixtures/sample-draft-recap.json', JSON.stringify({
    _note: 'SAMPLE recap content, generated from the hypothesised draft. Replaced after the real draft.',
    sample: true,
    generatedAt: new Date().toISOString(),
    feature: f,
    teams: c.map((card) => {
      const t = bySlugManager.get(card.manager as string)
      return { ...card, slug: t ? t.slug : slugFor(String(card.manager)),
        teamName: t?.teamName ?? '', teamId: t?.teamId ?? 0, grade: 'F' }
    }),
  }, null, 1) + '\n')
  console.log(`feature + ${c.length} report cards written`)
}
main().catch((e) => { console.error(e); process.exit(1) })

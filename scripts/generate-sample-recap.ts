/**
 * Generates SAMPLE recap content: one league-wide feature plus a report card
 * per team. Everything is labelled sample and replaced after the real draft.
 *
 *   npx tsx scripts/generate-sample-recap.ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { getDraftFeed, picksByTeam, slugFor, memberPhotoFor } from '../src/lib/draft/feed-data'

const MODEL = process.env.AI_MODEL || 'claude-opus-5'
const voice = readFileSync('AI-References/ROAST-BIBLE.md', 'utf8')

const SYSTEM = `${voice}

You are writing the draft recap for The Lab Rats, a 12-team superflex league.
This is longer-form than the live feed, but EVERY rule above still applies:
contractions, concrete images, American spelling, no throat-clearing, and the
joke is about the PLAYER or the ROSTER, never about draft position.

EVERY TEAM RECEIVES THE GRADE "F". That is the running joke of the whole page —
the analysis is genuine and rigorous, the grade is immovable. Never explain the
joke, never award a different grade, never hedge toward a real grade.

NEVER WRITE THE GRADE INTO THE PROSE. Do not end a paragraph with "Grade: F."
The page already stamps it next to the name; saying it again is the writer
laughing at his own joke.`

async function main() {
  const feed = await getDraftFeed()
  const byTeam = picksByTeam(feed.picks)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const teamSummaries = [...byTeam.entries()].map(([teamId, picks]) => ({
    teamId,
    manager: picks[0].manager,
    managerFull: picks[0].managerFull,
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
        headline: { type: 'string', description: 'Punchy, 3-8 words, no colon. This sits over a night-stadium photo.' },
        standfirst: { type: 'string', description: 'One sentence under the headline.' },
        sections: {
          type: 'array',
          description: '5-7 sections. Each is a THEME of the draft, not a round recap.',
          items: { type: 'object', properties: {
            heading: {
              type: 'string',
              description:
                'A funny, specific headline for this theme. Wordplay on a manager name is ' +
                'great — e.g. "James Went GaGa for Giants". 3-7 words.',
            },
            body: { type: 'array', items: { type: 'string' }, description: '1-2 paragraphs.' },
          }, required: ['heading', 'body'] },
        },
      }, required: ['headline', 'standfirst', 'sections'] },
    }],
    tool_choice: { type: 'tool', name: 'submit_feature' },
    messages: [{ role: 'user', content:
`Write the league-wide draft recap as an article built from 5-7 THEMED SECTIONS.

Each section covers one notable or funny thing that happened across the whole
draft — a run on a position, a manager who collected one NFL team, three people
who ignored quarterback, the kicker taken eight rounds early. NOT a round-by-
round account, and NOT one section per manager.

Section headings are jokes in their own right. Wordplay on a manager's name is
encouraged: "James Went GaGa for Giants". Keep them 3-7 words.

Do NOT state a grade for anyone — the report cards below the article do that,
and saying it here spoils them.

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
          manager: { type: 'string', description: 'FIRST NAME ONLY, exactly as given.' },
          verdict: { type: 'string', description: 'Punchy 3-7 word summary. This is the article headline for their page, so make it good.' },
          teaser: { type: 'string', description: 'One sentence for the tile. Under 25 words.' },
          body: { type: 'array', items: { type: 'string' }, description: '3 paragraphs, 500 WORDS MAXIMUM in total. Concise beats thorough.' },
        }, required: ['manager', 'verdict', 'teaser', 'body'] } },
      }, required: ['cards'] },
    }],
    tool_choice: { type: 'tool', name: 'submit_cards' },
    messages: [{ role: 'user', content: `Write a report card for each of the 12 teams. Hard limit: 500 words each, and shorter is better.\n\n${context}` }],
  })
  const c = (cards.content.find((b) => b.type === 'tool_use') as { input: { cards?: Record<string, unknown>[] } } | undefined)?.input?.cards ?? []

  const bySlugManager = new Map(teamSummaries.map((t) => [t.manager, t]))
  writeFileSync('fixtures/sample-draft-recap.json', JSON.stringify({
    // Inherit the feed's status rather than hardcoding. The live runner writes
    // `sample: false`, and hardcoding true here would stamp the real recap with
    // the orange SAMPLE banner on draft night.
    _note: feed.sample
      ? 'SAMPLE recap content, generated from the hypothesised draft.'
      : 'Recap of the real draft.',
    sample: feed.sample,
    generatedAt: new Date().toISOString(),
    feature: f,
    teams: c.map((card) => {
      const t = bySlugManager.get(card.manager as string)
      return {
        ...card,
        slug: t ? t.slug : slugFor(String(card.manager)),
        managerFull: t?.managerFull ?? String(card.manager),
        managerPhoto: t ? memberPhotoFor(t.managerFull) : null,
        teamName: t?.teamName ?? '', teamId: t?.teamId ?? 0, grade: 'F',
      }
    }),
  }, null, 1) + '\n')
  console.log(`feature + ${c.length} report cards written`)
}
main().catch((e) => { console.error(e); process.exit(1) })

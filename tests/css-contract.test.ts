/**
 * Guards the contract between components and globals.css.
 *
 * These are OUR classes, not Tailwind utilities — Tailwind generates its own,
 * but ours only exist if globals.css defines them. A missing definition throws
 * no error and fails no build; the element simply renders unstyled.
 *
 * That is exactly how three of these were silently deleted: an index-based edit
 * to the stylesheet removed .state-bar, .crown-badge and .live-dot along with
 * the block it meant to replace. Every page still rendered. Only the crown was
 * visually obvious enough to notice, and the state bars on five files' worth of
 * list rows had quietly stopped working.
 *
 * When adding a custom class, add it here too.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CUSTOM_CLASSES = [
  'display',        // condensed uppercase scoreboard face
  'eyebrow',        // mono specimen tag
  'tnum',           // tabular figures
  'state-bar',      // 3px meaning-carrying left edge
  'crown-badge',    // reigning champion gold
  'live-dot',       // pulsing live indicator
  'field-lines',    // football field backdrop
  'field-numbers',  // yard numbers
  'reveal-card',    // award reveal container
  'reveal-body',    // blurred award detail
  'reveal-hint',    // "Reveal" prompt
] as const

const css = readFileSync('src/app/globals.css', 'utf8')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full)
  }
  return out
}

const sources = walk('src').map((f) => ({ file: f, text: readFileSync(f, 'utf8') }))

describe('custom CSS classes', () => {
  it.each(CUSTOM_CLASSES)('.%s is defined in globals.css', (name) => {
    // Match the class as a selector TOKEN — followed by anything that is not
    // another name character. An earlier version required "{" or "," right
    // after, which false-negatived on compound selectors like
    // ".reveal-card:hover" and ".reveal-card[data-revealed]".
    const defined = new RegExp(`\\.${name}(?![\\w-])`).test(css)
    expect(defined, `.${name} is used by components but not defined in globals.css`).toBe(true)
  })

  it('every custom class used in a component is defined', () => {
    const missing: string[] = []
    for (const name of CUSTOM_CLASSES) {
      const usedIn = sources.filter((s) =>
        new RegExp(`["\\s\`]${name}[\\s"\`]`).test(s.text),
      )
      if (usedIn.length === 0) continue
      if (!new RegExp(`\\.${name}(?![\\w-])`).test(css)) {
        missing.push(`${name} (used in ${usedIn.length} file(s))`)
      }
    }
    expect(missing).toEqual([])
  })

  it('tokens the custom classes depend on are defined', () => {
    // .crown-badge reads these; without them the badge renders transparent.
    for (const token of ['--gold-hi', '--gold', '--gold-lo', '--gold-ink', '--state']) {
      const referenced = css.includes(`var(${token}`)
      const declared = new RegExp(`${token}\\s*:`).test(css)
      // --state is set inline by components, so it need only be referenced.
      expect(referenced || declared, `${token} is neither declared nor used`).toBe(true)
      if (token !== '--state') {
        expect(declared, `${token} is referenced but never declared`).toBe(true)
      }
    }
  })
})

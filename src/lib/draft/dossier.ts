import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DossierEntry } from './writer'

/**
 * Verified news, loaded from disk.
 *
 * This is the ONLY thing the writer may cite that is not on the fact sheet.
 * Without it a model asked for a "news cycle" roast will invent a suspension,
 * which is the single most damaging thing this bot could do — the jokes are
 * public and the players are real.
 *
 * Tier 2 entries cover off-field conduct. They are fair game per SOUL.md, but
 * `tier2Players()` exists so James can review them before anything ships.
 */
export interface DossierRecord {
  player: string
  tier: 1 | 2
  notes: string[]
  sources?: string[]
}

const DEFAULT_PATH = join(process.cwd(), 'fixtures', 'news-dossier.json')

export function loadDossier(path = DEFAULT_PATH): Map<string, DossierEntry> {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries: DossierRecord[] }
    const map = new Map<string, DossierEntry>()
    for (const e of raw.entries ?? []) {
      if (!e.player || !e.notes?.length) continue
      map.set(e.player, { player: e.player, notes: e.notes })
    }
    return map
  } catch {
    // A missing dossier must never break the draft. NEWS_CYCLE simply becomes
    // ineligible, because eligibility is keyed off dossier membership.
    return new Map()
  }
}

export function loadDossierRecords(path = DEFAULT_PATH): DossierRecord[] {
  try {
    return (JSON.parse(readFileSync(path, 'utf8')) as { entries: DossierRecord[] }).entries ?? []
  } catch { return [] }
}

/** Off-field entries, for James's review. */
export const tier2Players = (path?: string): DossierRecord[] =>
  loadDossierRecords(path).filter((e) => e.tier === 2)

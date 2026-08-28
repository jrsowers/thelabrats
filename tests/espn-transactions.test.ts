/**
 * Transaction parsing tests.
 *
 * ⚠️ These run against a HYPOTHESISED fixture, not a captured one — this league
 * had zero transactions when the real payload was pulled. The parser is
 * therefore verified for INTERNAL consistency only. Re-verify against a real
 * capture after the first transactions occur (§60).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { leagueResponseSchema } from '@/lib/espn/schemas'
import { toTransactions } from '@/lib/espn/transforms'

const payload = leagueResponseSchema.parse(
  JSON.parse(readFileSync('fixtures/hypothesised/mTransactions2-populated.json', 'utf8')),
)
const txns = toTransactions(payload)

describe('toTransactions', () => {
  it('drops ROSTER entries, which are lineup changes rather than moves', () => {
    expect(txns.find((t) => t.espnTransactionId === 'TXN-0004')).toBeUndefined()
    expect(txns).toHaveLength(4)
  })

  it('maps ESPN types onto ours', () => {
    const byId = new Map(txns.map((t) => [t.espnTransactionId, t]))
    expect(byId.get('TXN-0001')?.type).toBe('WAIVER')
    expect(byId.get('TXN-0002')?.type).toBe('FREE_AGENT')
    expect(byId.get('TXN-0003')?.type).toBe('TRADE')
  })

  it('keeps an add/drop pair together as one transaction', () => {
    const waiver = txns.find((t) => t.espnTransactionId === 'TXN-0001')!
    expect(waiver.items.map((i) => i.action).sort()).toEqual(['ADD', 'DROP'])
  })

  it('keeps both sides of a trade on one transaction', () => {
    // Spec §23.4: a trade is one row, not one row per player.
    const trade = txns.find((t) => t.espnTransactionId === 'TXN-0003')!
    expect(trade.items).toHaveLength(3)
    const teams = new Set(trade.items.flatMap((i) => [i.fromTeamId, i.toTeamId]))
    expect(teams.has(1) && teams.has(9)).toBe(true)
  })

  it('reports no FAAB, since this league does not use it', () => {
    expect(txns.every((t) => t.faabAmount === null)).toBe(true)
  })

  it('never collapses two transactions onto one id when ESPN omits one', () => {
    const ids = txns.map((t) => t.espnTransactionId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.some((id) => id.startsWith('unknown-'))).toBe(true)
  })

  it('converts ESPN epoch millis to ISO timestamps', () => {
    const t = txns.find((t) => t.espnTransactionId === 'TXN-0001')!
    expect(t.processedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

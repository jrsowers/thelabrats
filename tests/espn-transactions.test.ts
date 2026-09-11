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
  it('keeps a ROSTER entry as a LINEUP move rather than dropping it', () => {
    // It used to be dropped. Start/sit swaps stay out of the transaction LOG,
    // but they are real roster decisions and The Galaxy Brain counts them.
    expect(txns.find((t) => t.espnTransactionId === 'TXN-0004')?.type).toBe('LINEUP')
    expect(txns).toHaveLength(5)
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

describe('toTransactions — against the real capture', () => {
  // Replaces the hypothesised-only coverage this file opened with. Captured
  // 2026-09-11, after a draft, eleven free agent moves, two waiver claims, a
  // trade, seven IR moves and seven start/sit swaps (§60).
  const real = toTransactions(
    leagueResponseSchema.parse(JSON.parse(readFileSync('fixtures/mTransactions2.json', 'utf8'))),
  )

  it('keeps every transaction ESPN sent', () => {
    expect(real).toHaveLength(211)
  })

  it('splits ESPN’s one ROSTER type into IR moves and lineup swaps', () => {
    const roster = real.filter((t) =>
      t.type === 'IR_PLACE' || t.type === 'IR_ACTIVATE' || t.type === 'LINEUP')
    expect(roster).toHaveLength(14)
    expect(real.filter((t) => t.type === 'IR_PLACE')).toHaveLength(7)
    expect(real.filter((t) => t.type === 'LINEUP')).toHaveLength(7)
  })

  it('records a swap as ONE transaction carrying two players', () => {
    // ESPN sends the player coming in and the player going out as two items on
    // a single row. Counting items would score one substitution as two moves.
    const swaps = real.filter((t) => t.type === 'LINEUP' && t.items.length === 2)
    expect(swaps.length).toBeGreaterThan(0)
  })

  it('keeps a cancelled waiver, flagged, rather than silently dropping it', () => {
    const canceled = real.filter((t) => t.status === 'CANCELED')
    expect(canceled).toHaveLength(3)
    expect(canceled.every((t) => t.type === 'WAIVER')).toBe(true)
  })

  it('scopes every transaction to a scoring period the awards can group by', () => {
    const nonDraft = real.filter((t) => t.type !== 'DRAFT')
    expect(nonDraft.every((t) => t.scoringPeriod != null)).toBe(true)
  })
})

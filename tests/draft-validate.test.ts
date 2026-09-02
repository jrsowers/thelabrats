import { describe, it, expect } from 'vitest'
import { validateRoast } from '../src/lib/draft/validate'

const injured = { player: 'Luther Burden III', notes: ['Suffered a groin injury on 8 August 2026 in a contested red-zone rep.'] }
const outForYear = { player: 'Ricky Pearsall', notes: ['Underwent knee surgery and is out for the 2026 season.'] }

describe('status invention guard', () => {
  it('passes a roast that makes no status claim', () => {
    expect(validateRoast('Colin needed a back coming off two ACL tears.', injured).ok).toBe(true)
  })

  it('rejects the exact failure seen in production', () => {
    // The dossier gave a date and an injury. It never said "questionable".
    const r = validateRoast('He is listed as questionable and suffered a groin injury on 8 August.', injured)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/current status/)
  })

  it('rejects a status claim when there is no dossier entry at all', () => {
    expect(validateRoast('Rome Odunze is questionable for week one.').ok).toBe(false)
  })

  it('allows a status the dossier actually states', () => {
    expect(validateRoast('Pearsall is out for the season and Doug took him anyway.', outForYear).ok).toBe(true)
  })

  it('catches the softer phrasings too', () => {
    for (const bad of [
      'He remains sidelined after camp.',
      'He is expected back by week three.',
      'He will miss the opener.',
      'He has not been cleared to practise.',
    ]) {
      expect(validateRoast(bad, injured).ok, bad).toBe(false)
    }
  })

  it('does not fire on ordinary football language', () => {
    for (const fine of [
      'Doug is drafting like a man with nothing to lose.',
      'That is four receivers and one quarterback.',
      'Keshia took the best player on the board.',
      'Jay reached twenty-five slots for a kicker.',
    ]) {
      expect(validateRoast(fine, injured).ok, fine).toBe(true)
    }
  })
})

import { describe, it, expect } from 'vitest'
import { validateRoast, checkStyle, checkCraft } from '../src/lib/draft/validate'

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

describe('style checker', () => {
  it('catches the exact lines James flagged', () => {
    const a = checkStyle('Bree drafted a man who is not allowed to touch the ball with his hands.')
    expect(a.ok).toBe(false)
    expect(a.notes[0]).toMatch(/uncontracted/)

    const b = checkStyle('Taken forty-seven picks before the country would have bothered.')
    expect(b.ok).toBe(false)
    expect(b.notes[0]).toMatch(/abstraction/)
  })

  it('passes the spoken versions of the same lines', () => {
    expect(checkStyle("Bree drafted a guy who isn't allowed to touch the ball with his hands.").ok).toBe(true)
    expect(checkStyle('Taken forty-seven picks before anyone not in an insane asylum would have bothered.').ok).toBe(true)
  })

  it('catches throat-clearing', () => {
    expect(checkStyle('That is four receivers, which means his bye week is arguably a problem.').ok).toBe(false)
  })

  it('catches British spelling, which leaked in from the style guide itself', () => {
    const r = checkStyle('Evan took a defence before anyone else had thought about one.')
    expect(r.ok).toBe(false)
    expect(r.notes[0]).toMatch(/British/)
    expect(checkStyle('Evan took a defense before anyone else had thought about one.').ok).toBe(true)
  })

  it('catches gendered collectives, which shipped in a headline', () => {
    for (const bad of [
      'Twelve men walk into a draft room.',
      'The guys spent nine rounds ignoring quarterback.',
      'Every man in this league reached for a tight end.',
    ]) {
      expect(checkStyle(bad).ok, bad).toBe(false)
    }
    expect(checkStyle('All twelve managers walked into a draft room.').ok).toBe(true)
    expect(checkStyle('Doug took the guy nobody wanted.').ok).toBe(true)
  })

  it('does not fire on ordinary roast language', () => {
    for (const fine of [
      "Mike bid against himself, overpaid, and looked pleased about it.",
      "Jay took a kicker in the twelfth round. Not the fifteenth. The twelfth.",
      "The memories are now being kicked from forty-two yards out.",
    ]) {
      expect(checkStyle(fine).ok, fine).toBe(true)
    }
  })
})

describe('craft checks from ROAST-WRITER.md', () => {
  it('rejects the punctuation the spec bans', () => {
    expect(checkCraft('Doug took a kicker — in round eleven.').ok).toBe(false)
    expect(checkCraft('Doug took a kicker; nobody stopped him.').ok).toBe(false)
    expect(checkCraft('Doug took a kicker in round eleven!').ok).toBe(false)
  })

  it('rejects the weak-AI-comedy list', () => {
    for (const bad of [
      'Bold strategy from Doug in the eleventh.',
      "He got his guy, and nobody else wanted him.",
      'Only time will tell whether that works.',
      'A masterclass in ignoring the quarterback slot.',
    ]) {
      expect(checkCraft(bad).ok, bad).toBe(false)
    }
  })

  it('caps length at the spec ceiling', () => {
    const long = Array.from({ length: 50 }, () => 'word').join(' ')
    const r = checkCraft(long)
    expect(r.ok).toBe(false)
    expect(r.notes.join(' ')).toMatch(/45/)
  })

  it('passes a roast written to spec', () => {
    const good = "Doug took a kicker in the eleventh. Not the fifteenth, where they live. The eleventh."
    expect(checkCraft(good).ok).toBe(true)
    expect(checkStyle(good).ok).toBe(true)
  })
})

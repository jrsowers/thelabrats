/**
 * Playoff bracket construction (§21.3).
 *
 * Pure and configuration-driven — nothing here knows this league has six teams
 * or two byes. Both fall out of `playoffTeamCount`.
 *
 * PAIRING IS A FIXED BRACKET, NOT RESEEDED — CONFIRMED by the commissioner
 * (2026-08-28). Six-team field: 3v6 and 4v5 in round one, then #1 plays the
 * 4/5 winner and #2 plays the 3/6 winner. Seeds do not shuffle between rounds,
 * which is what the code below already does.
 */

export interface Seed {
  seed: number
  seasonTeamId: number
}

export interface BracketSlot {
  /** Present once the participant is known. */
  seed: number | null
  seasonTeamId: number | null
  /** Where an unknown participant comes from, e.g. "Winner of 4/5". */
  placeholder: string | null
}

export interface BracketGame {
  id: string
  round: number
  week: number
  label: string
  home: BracketSlot
  away: BracketSlot
}

export interface BracketRound {
  round: number
  name: string
  week: number
  games: BracketGame[]
  /** Seeds resting this round. */
  byes: Seed[]
}

const ROUND_NAMES = ['Championship', 'Semifinals', 'Quarterfinals', 'First Round']

/** Name rounds from the final backwards, so the last is always "Championship". */
function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  return ROUND_NAMES[fromEnd] ?? `Round ${round}`
}

const slot = (s: Seed | undefined, placeholder: string | null = null): BracketSlot =>
  s ? { seed: s.seed, seasonTeamId: s.seasonTeamId, placeholder: null }
    : { seed: null, seasonTeamId: null, placeholder }

/**
 * Build the bracket for `playoffTeamCount` seeds starting at `startWeek`.
 *
 * The field is padded to the next power of two; the difference is byes, awarded
 * to the top seeds. A 6-team field becomes an 8-slot bracket with 2 byes.
 */
export function buildBracket(
  seeds: Seed[],
  playoffTeamCount: number,
  startWeek: number,
): BracketRound[] {
  const field = seeds.slice(0, playoffTeamCount)
  if (field.length === 0) return []

  const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, playoffTeamCount)))
  const byeCount = bracketSize - playoffTeamCount
  const totalRounds = Math.log2(bracketSize)

  const byes = field.filter((s) => s.seed <= byeCount)
  const playIn = field.filter((s) => s.seed > byeCount)

  const rounds: BracketRound[] = []

  // Round 1: highest remaining seed meets the lowest, working inward.
  const firstRoundGames: BracketGame[] = []
  for (let i = 0; i < playIn.length / 2; i++) {
    const high = playIn[i]
    const low = playIn[playIn.length - 1 - i]
    firstRoundGames.push({
      id: `r1-g${i + 1}`,
      round: 1,
      week: startWeek,
      label: `${high.seed} vs ${low.seed}`,
      home: slot(high),
      away: slot(low),
    })
  }

  rounds.push({
    round: 1,
    name: roundName(1, totalRounds),
    week: startWeek,
    games: firstRoundGames,
    byes,
  })

  // Later rounds: byes enter, winners advance. Participants are unknown until
  // played, so slots carry a placeholder describing where they come from.
  let previous = rounds[0]
  for (let round = 2; round <= totalRounds; round++) {
    const advancing: BracketSlot[] = []

    if (round === 2) {
      // Byes enter here, top seed first.
      for (const b of byes) advancing.push(slot(b))
    }
    for (const g of previous.games) {
      advancing.push({ seed: null, seasonTeamId: null, placeholder: `Winner ${g.label}` })
    }

    const games: BracketGame[] = []
    for (let i = 0; i < advancing.length / 2; i++) {
      // Fixed bracket: top half meets bottom half.
      const home = advancing[i]
      const away = advancing[advancing.length - 1 - i]
      games.push({
        id: `r${round}-g${i + 1}`,
        round,
        week: startWeek + round - 1,
        label: home.seed && away.seed ? `${home.seed} vs ${away.seed}` : 'TBD',
        home,
        away,
      })
    }

    const r: BracketRound = {
      round,
      name: roundName(round, totalRounds),
      week: startWeek + round - 1,
      games,
      byes: [],
    }
    rounds.push(r)
    previous = r
  }

  return rounds
}

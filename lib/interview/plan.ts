export type Difficulty = 'easy' | 'medium' | 'hard'

/** Map question index to difficulty */
export function indexToDifficulty(i: number): Difficulty {
  if (i === 0 || i === 1) return 'easy'
  if (i === 2 || i === 3) return 'medium'
  if (i === 4 || i === 5) return 'hard'
  throw new Error('Invalid question index: ' + i)
}

/** Map difficulty to target duration in ms */
export function difficultyToDurationMs(d: Difficulty): number {
  if (d === 'easy') return 20000
  if (d === 'medium') return 60000
  if (d === 'hard') return 120000
  throw new Error('Invalid difficulty: ' + d)
}

/** Generate the full 6-question plan */
export function makePlan() {
  return Array.from({ length: 6 }, (_, i) => {
    const difficulty = indexToDifficulty(i)
    return {
      index: i,
      difficulty,
      targetDurationMs: difficultyToDurationMs(difficulty),
    }
  })
}

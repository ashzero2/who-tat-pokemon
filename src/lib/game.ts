import type { GenerationId, PokemonSummary } from '$lib/data/pokemon';

export type GameSettings = {
  generations: GenerationId[];
  rounds: number;
};

export type RoundOutcome = 'idle' | 'correct' | 'miss';

export type GameRound = {
  answer: PokemonSummary;
  choices: PokemonSummary[];
};

export const defaultSettings: GameSettings = {
  generations: [1],
  rounds: 10
};

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createRound(roster: PokemonSummary[], usedIds: Set<number>): GameRound {
  const available = roster.filter((entry) => !usedIds.has(entry.id));
  const answerPool = available.length > 0 ? available : roster;
  const answer = answerPool[Math.floor(Math.random() * answerPool.length)];
  const decoys = shuffle(roster.filter((entry) => entry.id !== answer.id)).slice(0, 3);

  return {
    answer,
    choices: shuffle([answer, ...decoys])
  };
}

export function scoreForAnswer(isCorrect: boolean, streak: number) {
  if (!isCorrect) return 0;
  return 100 + streak * 25;
}

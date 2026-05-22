import type { GenerationId, PokemonEntry } from '$lib/data/types';

export type { GenerationId };

// ── Types ─────────────────────────────────────────────────────────────────────

export type GameSettings = {
	generations: GenerationId[];
	rounds: number;
};

export type RoundOutcome = 'idle' | 'correct' | 'miss';

export type GameRound = {
	answer: PokemonEntry;
	choices: PokemonEntry[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const AUTO_ADVANCE_SECONDS = 5;

export const defaultSettings: GameSettings = {
	generations: [1, 2],
	rounds: 10
};

// ── Pure functions ────────────────────────────────────────────────────────────

export function shuffle<T>(items: T[]): T[] {
	return [...items].sort(() => Math.random() - 0.5);
}

export function createRound(roster: PokemonEntry[], usedIds: Set<number>): GameRound {
	const available = roster.filter((e) => !usedIds.has(e.id));
	const answerPool = available.length > 0 ? available : roster;
	const answer = answerPool[Math.floor(Math.random() * answerPool.length)];
	const decoys = shuffle(roster.filter((e) => e.id !== answer.id)).slice(0, 3);
	return { answer, choices: shuffle([answer, ...decoys]) };
}

export function scoreForAnswer(isCorrect: boolean, streak: number, multiplier = 1): number {
	if (!isCorrect) return 0;
	return Math.round((100 + streak * 25) * multiplier);
}

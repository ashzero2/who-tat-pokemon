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

export type RoundOptions = {
	/** When true, decoys are restricted to the same generation as the answer. */
	regionLock?: boolean;
};

export function createRound(
	roster: PokemonEntry[],
	usedIds: Set<number>,
	options: RoundOptions = {}
): GameRound {
	const available = roster.filter((e) => !usedIds.has(e.id));
	const answerPool = available.length > 0 ? available : roster;
	const answer = answerPool[Math.floor(Math.random() * answerPool.length)];

	// Build decoy pool — optionally restrict to same generation
	let decoyPool = roster.filter((e) => e.id !== answer.id);
	if (options.regionLock) {
		const sameGen = decoyPool.filter((e) => e.generation === answer.generation);
		// Fall back to full pool if not enough same-gen decoys
		if (sameGen.length >= 3) decoyPool = sameGen;
	}
	const decoys = shuffle(decoyPool).slice(0, 3);

	return { answer, choices: shuffle([answer, ...decoys]) };
}

export function scoreForAnswer(isCorrect: boolean, streak: number, multiplier = 1): number {
	if (!isCorrect) return 0;
	return Math.round((100 + streak * 25) * multiplier);
}

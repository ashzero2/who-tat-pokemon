import type { ModeId } from '$lib/modes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModeStats = {
	gamesPlayed: number;
	highScore: number;
	bestStreak: number;
	totalCorrect: number;
	totalMissed: number;
};

export type LocalStats = {
	/** Schema version for future migrations */
	version: number;
	/** Totals across all modes */
	overall: ModeStats;
	/** Per-mode breakdown */
	byMode: Partial<Record<ModeId, ModeStats>>;
};

// ── Defaults ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pokedex-stats-v1';

function emptyModeStats(): ModeStats {
	return {
		gamesPlayed: 0,
		highScore: 0,
		bestStreak: 0,
		totalCorrect: 0,
		totalMissed: 0
	};
}

function defaultStats(): LocalStats {
	return {
		version: 1,
		overall: emptyModeStats(),
		byMode: {}
	};
}

// ── Load / save ───────────────────────────────────────────────────────────────

export function loadStats(): LocalStats {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultStats();
		const parsed = JSON.parse(raw) as Partial<LocalStats>;
		// Guard against schema drift
		if (parsed.version !== 1) return defaultStats();
		return {
			version: 1,
			overall: { ...emptyModeStats(), ...(parsed.overall ?? {}) },
			byMode: parsed.byMode ?? {}
		};
	} catch {
		return defaultStats();
	}
}

export function saveStats(stats: LocalStats): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
	} catch {
		// localStorage may be unavailable (private mode, quota exceeded)
	}
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

/**
 * Records the result of a completed game and persists to localStorage.
 *
 * @param mode      The mode that was played
 * @param score     Final score for the game
 * @param streak    Longest streak achieved in the game
 * @param correct   Number of correct answers
 * @param missed    Number of missed answers
 */
export function recordGame(
	mode: ModeId,
	score: number,
	streak: number,
	correct: number,
	missed: number
): LocalStats {
	const stats = loadStats();

	function update(bucket: ModeStats): ModeStats {
		return {
			gamesPlayed: bucket.gamesPlayed + 1,
			highScore: Math.max(bucket.highScore, score),
			bestStreak: Math.max(bucket.bestStreak, streak),
			totalCorrect: bucket.totalCorrect + correct,
			totalMissed: bucket.totalMissed + missed
		};
	}

	stats.overall = update(stats.overall);
	stats.byMode[mode] = update(stats.byMode[mode] ?? emptyModeStats());

	saveStats(stats);
	return stats;
}

export function clearStats(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// noop
	}
}

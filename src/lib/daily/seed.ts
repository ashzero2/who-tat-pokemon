import { SeededRng } from './rng';
import type { PokemonEntry } from '$lib/data/types';

// ── Daily seed format ─────────────────────────────────────────────────────────

/**
 * Returns a numeric seed derived from the local calendar date (YYYY-MM-DD).
 * Two players on the same calendar date always get the same seed.
 *
 * @param date - optional override for testing; defaults to today's local date
 */
export function dailySeedForDate(date?: Date): number {
	const d = date ?? new Date();
	const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	// Simple djb2-like hash over the UTF-16 code points of the date string
	let hash = 5381;
	for (let i = 0; i < iso.length; i++) {
		hash = ((hash << 5) + hash) ^ iso.charCodeAt(i);
		hash = hash >>> 0; // keep uint32
	}
	return hash;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) used as the "challenge identifier"
 * shown in the UI.
 */
export function todayLabel(date?: Date): string {
	const d = date ?? new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Deterministic round generation ───────────────────────────────────────────

/**
 * Generates a deterministic list of `count` Pokémon IDs from `roster`
 * for the given seed — no duplicates.
 *
 * Identical seed + identical roster → identical IDs, every time.
 */
export function dailyRoundIds(
	roster: PokemonEntry[],
	seed: number,
	count = 10
): number[] {
	const rng = new SeededRng(seed);
	const shuffled = rng.shuffle(roster);
	return shuffled.slice(0, Math.min(count, shuffled.length)).map((e) => e.id);
}

import type { PokemonEntry } from '$lib/data/types';
import { getBestArtwork } from '$lib/data/pokemon-loader';

const preloaded = new Set<string>();

/**
 * Kicks off a browser Image preload for the given URL, memoised so each URL
 * is only fetched once per session.
 */
function preloadUrl(url: string): void {
	if (!url || preloaded.has(url)) return;
	preloaded.add(url);
	const img = new Image();
	img.src = url;
	// Fallback: if official art fails, try sprite
	img.onerror = () => {
		preloaded.delete(url);
	};
}

/**
 * Preloads the artwork for a Pokémon entry using the best-available URL,
 * with fallback chain: official → home → sprite → fallback.
 */
export function preloadEntry(entry: PokemonEntry): void {
	preloadUrl(getBestArtwork(entry));
}

/**
 * Preloads artwork for the next N entries from the queue (already selected
 * future rounds). Call this after the current round's image has loaded.
 */
export function preloadQueue(entries: PokemonEntry[], count = 2): void {
	entries.slice(0, count).forEach(preloadEntry);
}

/**
 * Generates a deterministic list of upcoming answer candidates from the
 * roster, skipping already-used IDs. Used to warm the image cache for the
 * next rounds before they are created.
 *
 * @param roster - full playable roster for the active generations
 * @param usedIds - IDs already consumed this game
 * @param count - how many candidates to peek ahead
 */
export function peekQueue(
	roster: PokemonEntry[],
	usedIds: Set<number>,
	count = 2
): PokemonEntry[] {
	const available = roster.filter((e) => !usedIds.has(e.id));
	const pool = available.length >= count ? available : roster;
	// Shuffle a stable slice so we can peek at likely upcoming artwork
	return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

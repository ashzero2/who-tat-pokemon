import type {
	GenerationId,
	PokemonDataManifest,
	PokemonEntry,
	PokemonGenerationChunk
} from './types';

const BASE_URL = '/data/pokemon';

let manifestCache: PokemonDataManifest | null = null;
const generationCache = new Map<GenerationId, PokemonEntry[]>();

export async function loadManifest(): Promise<PokemonDataManifest> {
	if (manifestCache) return manifestCache;
	const res = await fetch(`${BASE_URL}/index.json`);
	if (!res.ok) throw new Error(`Failed to load Pokédex manifest (HTTP ${res.status})`);
	manifestCache = (await res.json()) as PokemonDataManifest;
	return manifestCache;
}

export async function loadGeneration(genId: GenerationId): Promise<PokemonEntry[]> {
	if (generationCache.has(genId)) return generationCache.get(genId)!;

	const manifest = await loadManifest();
	const genInfo = manifest.generations.find((g) => g.id === genId);
	if (!genInfo) throw new Error(`Generation ${genId} not found in manifest`);

	const res = await fetch(`${BASE_URL}/${genInfo.chunk}`);
	if (!res.ok) throw new Error(`Failed to load Generation ${genId} data (HTTP ${res.status})`);

	const chunk: PokemonGenerationChunk = await res.json();
	const entries = chunk.entries.filter((e) => e.guessable);
	generationCache.set(genId, entries);
	return entries;
}

export async function loadGenerations(genIds: GenerationId[]): Promise<PokemonEntry[]> {
	const chunks = await Promise.all(genIds.map((id) => loadGeneration(id)));
	return chunks.flat();
}

/** Returns the best available artwork URL for a Pokémon entry. */
export function getBestArtwork(entry: PokemonEntry): string {
	return (
		entry.artwork.official ??
		entry.artwork.home ??
		entry.artwork.sprite ??
		entry.artwork.fallback ??
		''
	);
}

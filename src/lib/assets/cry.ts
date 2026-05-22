/**
 * Play the cry audio for a Pokémon using PokeAPI's cry repository.
 * Falls back silently if audio cannot be loaded or played.
 */

const CRY_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';

let _audio: HTMLAudioElement | null = null;

/**
 * Play the cry for a given PokéAPI Pokémon ID.
 * Uses a single reusable Audio element to avoid creating many DOM nodes.
 */
export function playCry(pokemonApiId: number): void {
	try {
		const url = `${CRY_BASE}/${pokemonApiId}.ogg`;

		if (!_audio) {
			_audio = new Audio();
			_audio.volume = 0.4;
		}

		// Stop any currently playing cry
		_audio.pause();
		_audio.currentTime = 0;
		_audio.src = url;
		_audio.play().catch(() => {
			// Silently ignore — autoplay policy or network issue
		});
	} catch {
		// Environment without Audio (SSR) — ignore
	}
}
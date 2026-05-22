// Re-export from the game module for backwards compatibility.
// New code should import from '$lib/game' (src/lib/game/index.ts).
export { GameController, AUTO_ADVANCE_SECONDS, createRound, defaultSettings, scoreForAnswer, shuffle } from './game/index';
export type { GameRound, GameSettings, GenerationId, RoundOutcome } from './game/index';

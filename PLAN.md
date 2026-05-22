# Phased Pokédex Optimization Implementation Plan

## Summary
Implement the optimization roadmap on a new feature branch using **reviewable subsystem commits**. Each phase must pass checks before committing. Final branch name: `codex/pokedex-optimization`. Push the branch after all phases complete unless interrupted.

## Phase 1: Static App Foundation
Commit: `chore: configure static pokedex deployment`  
Description: Switch SvelteKit to static-friendly deployment and prepare data to live outside the JS bundle.

Steps:
- Install and configure `@sveltejs/adapter-static`.
- Update `svelte.config.js` to use static adapter.
- Keep `src/routes/+page.ts` with `ssr = false`.
- Add `static/data/pokemon/` target directory.
- Keep current game behavior unchanged.

Checks:
- `npm run check`
- `npm run build`

## Phase 2: Generated Chunked Pokémon Data
Commit: `feat: generate chunked pokemon roster data`  
Description: Replace bundled roster data with static JSON chunks and a manifest.

Steps:
- Move shared data interfaces into `src/lib/data/types.ts`.
- Rewrite `scripts/generate-pokemon-data.mjs` to output:
  - `static/data/pokemon/index.json`
  - `static/data/pokemon/gen-1.json` through `gen-9.json`
- Include species plus forms using PokéAPI species varieties.
- Add fields: `id`, `speciesId`, `pokemonApiId`, `name`, `displayName`, `generation`, `types`, `isDefault`, `formName`, `aliases`, `artwork`, `guessable`.
- Exclude entries from gameplay with `guessable: false`, but keep them in generated metadata.
- Add `npm run validate:pokemon`.
- Generate and commit Gen 1-9 JSON data.

Checks:
- `npm run generate:pokemon`
- `npm run validate:pokemon`
- `npm run check`
- `npm run build`

## Phase 3: Runtime Data Loader
Commit: `feat: lazy load pokemon generation chunks`  
Description: Load only selected generation data at runtime instead of bundling the roster.

Steps:
- Add `src/lib/data/pokemon-loader.ts`.
- Fetch `index.json` on page load.
- Fetch generation chunks only when selected.
- Memoize loaded generation chunks in memory.
- Replace direct `pokemonRoster` imports in the game route.
- Show loading and error states in the Pokédex UI.
- Keep Gen 1 and Gen 2 selected by default.

Checks:
- `npm run check`
- `npm run build`
- Manual: load Gen 1 only, Gen 2 only, Gen 1+2.

## Phase 4: Game Engine Refactor
Commit: `refactor: separate pokedex game engine from ui`  
Description: Move gameplay state and rules out of the Svelte page.

Steps:
- Expand `src/lib/game.ts` or split into `src/lib/game/`.
- Move round creation, scoring, selected generations, used IDs, countdown, and reveal state into pure TS modules.
- Add a small Svelte controller/store for UI integration.
- Keep `+page.svelte` focused on rendering and event wiring.
- Preserve current 10-round Classic flow and 5-second correct-answer auto-advance.

Checks:
- `npm run check`
- `npm run build`
- Manual: correct answer auto-advances, wrong answer does not auto-advance, reset clears timer.

## Phase 5: Image Lazy Loading And Preload Queue
Commit: `feat: preload queued pokemon artwork`  
Description: Load artwork lazily and preload only the next planned images.

Steps:
- Add `src/lib/assets/preload.ts`.
- Load only the current round image immediately.
- Generate the next 1-2 queued rounds after the current round is created.
- Preload queued artwork after current image load completes.
- Use artwork fallback order from generated data: official, home, sprite, fallback.
- Add UI fallback for missing artwork.

Checks:
- `npm run check`
- `npm run build`
- Manual: throttle network, verify only current plus queued images load.

## Phase 6: Mode Framework
Commit: `feat: add pokedex game mode framework`  
Description: Add the structure for multiple modes before implementing every mode.

Steps:
- Add mode definitions for:
  - Classic
  - Timed
  - Region Lock
  - Type Hint
  - Silhouette Hard Mode
- Implement Classic fully using the new mode interface.
- Add mode selector UI, but mark unfinished modes as locked or preview.
- Ensure mode definitions control round count, timer behavior, scoring modifiers, hints, and reveal rules.
- Do not implement Cry Guess yet.

Checks:
- `npm run check`
- `npm run build`
- Manual: Classic remains playable; locked modes cannot start.

## Phase 7: Local Stats Foundation
Commit: `feat: persist local pokedex game stats`  
Description: Add local-only stats without accounts or backend.

Steps:
- Add `src/lib/stats/local-stats.ts`.
- Store stats in `localStorage`.
- Track games played, high score, best streak, correct answers, missed answers, and mode-level records.
- Add a compact stats readout to the existing UI.
- Make stats resilient to missing/corrupt localStorage data.

Checks:
- `npm run check`
- `npm run build`
- Manual: play a game, refresh, verify stats persist.

## Phase 8: Daily Challenge Design Stub
Commit: `feat: add daily challenge seed utilities`  
Description: Add deterministic daily challenge foundations without leaderboard backend.

Steps:
- Add seeded RNG utilities.
- Add daily seed format based on local calendar date.
- Add helper to generate deterministic round IDs from loaded roster.
- Add UI placeholder for Daily Challenge as locked/coming soon.
- Do not add backend leaderboards yet.

Checks:
- `npm run check`
- `npm run build`
- Manual: same date and same generation selection produce same deterministic IDs.

## Final Verification And Push
Commit: none unless fixes are needed.

Steps:
- Run full validation:
  - `npm run validate:pokemon`
  - `npm run check`
  - `npm run build`
- Inspect git history:
  - one clean commit per phase
  - no generated caches except intended static JSON
  - no `node_modules`, `.svelte-kit`, or build artifacts committed
- Push:
  - `git push -u origin codex/pokedex-optimization`

## Assumptions
- Use a feature branch, not direct commits to `main`.
- Push once after all phases complete.
- Include forms when they have usable artwork.
- Keep optimized local WebP/AVIF assets for a later pipeline.
- Keep the app static and avoid runtime PokéAPI dependency.
- Prioritize game modes before daily challenges and leaderboards.

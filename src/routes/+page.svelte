<script lang="ts">
  import '../app.css';
  import { generations } from '$lib/data/pokemon';
  import type { GenerationId } from '$lib/data/types';
  import { getBestArtwork } from '$lib/data/pokemon-loader';
  import { GameController, AUTO_ADVANCE_SECONDS, defaultSettings } from '$lib/game';

  const GENERATION_FILTERS: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const UNLOCKED_GENERATIONS: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const game = new GameController();

  let generationLabel = $derived(
    game.answer
      ? (generations.find((g) => g.id === game.answer!.generation)?.label ?? 'Unknown')
      : ''
  );

  function statusText(): string {
    if (!game.answer) return 'Loading scanner data…';
    if (game.outcome === 'correct' && game.countdown !== null)
      return `Registered. Next scan in ${game.countdown}s.`;
    if (game.outcome === 'correct') return 'Registered. Clean read on the silhouette.';
    if (game.outcome === 'miss') return `Signal resolved: ${game.answer.displayName}.`;
    return 'Scanner locked. Identify the silhouette.';
  }

  // Initial load
  game.loadRoster(defaultSettings.generations);
</script>

<svelte:head>
  <title>Who's That Pokemon?</title>
  <meta
    name="description"
    content="A refined Pokédex-themed silhouette guessing game built for every generation."
  />
</svelte:head>

<main class="pokedex-room">
  <section class="console" aria-labelledby="game-title">
    <div class="console-lid">
      <div class="lens-cluster" aria-hidden="true">
        <span class="lens main"></span>
        <span class="lens red"></span>
        <span class="lens amber"></span>
        <span class="lens green"></span>
      </div>

      <div class="title-block">
        <p>Oak Lab uplink</p>
        <h1 id="game-title">Who's That Pokemon?</h1>
      </div>

      <button
        class="reset-button"
        type="button"
        aria-label="Start a new game"
        onclick={() => game.newGame()}
      >
        RESET
      </button>
    </div>

    <div class="console-body">
      <section class="left-deck" aria-label="Mystery Pokemon scanner">
        <div class="scanner-meta">
          <div>
            <span>Round</span>
            <strong>{game.roundNumber}/{game.roundLimit}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{game.score}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{game.streak}</strong>
          </div>
        </div>

        <div
          class:revealed={game.isRevealed}
          class:ready={game.imageReady}
          class="scanner-screen"
        >
          <div class="screen-grid" aria-hidden="true"></div>
          <div class="target-ring" aria-hidden="true"></div>

          {#if game.loading}
            <div class="scanner-loading" aria-live="polite">
              <span class="loading-spinner" aria-hidden="true"></span>
              <p>Loading Pokédex data…</p>
            </div>
          {:else if game.loadError}
            <div class="scanner-error" role="alert">
              <p>⚠ {game.loadError}</p>
              <button type="button" onclick={() => game.loadRoster(game.selectedGenerations)}>
                Retry
              </button>
            </div>
          {:else if game.answer}
            <img
              src={getBestArtwork(game.answer)}
              alt={game.isRevealed ? game.answer.displayName : 'Mystery Pokemon silhouette'}
              onload={() => (game.imageReady = true)}
              onerror={(e) => {
                if (!game.answer) return;
                const img = e.currentTarget as HTMLImageElement;
                const fallback = game.answer.artwork.sprite ?? game.answer.artwork.fallback ?? '';
                if (img.src !== fallback) img.src = fallback;
              }}
            />
          {/if}

          <div class="screen-footer">
            <span>{statusText()}</span>
            {#if game.answer}
              <span>{String(game.answer.id).padStart(3, '0')}</span>
            {/if}
          </div>
        </div>

        <div class="progress-track" aria-label="Round progress">
          <span style={`width: ${game.progress}%`}></span>
        </div>
      </section>

      <section class="right-deck" aria-label="Game controls">
        <div class="mode-strip" aria-label="Generation filter">
          {#each GENERATION_FILTERS as id}
            {@const locked = !UNLOCKED_GENERATIONS.includes(id)}
            <button
              class:active={game.selectedGenerations.includes(id)}
              class:locked
              type="button"
              aria-label={`Generation ${id}${locked ? ' locked for future expansion' : ''}`}
              onclick={() => game.toggleGeneration(id, UNLOCKED_GENERATIONS)}
              title={locked ? 'Coming soon' : `Generation ${id} roster`}
            >
              {id}
            </button>
          {/each}
        </div>

        <div class="dex-readout">
          <p>Dex readout</p>
          <h2>{game.isRevealed && game.answer ? game.answer.displayName : 'Unknown'}</h2>
          <dl>
            <div>
              <dt>Region</dt>
              <dd>{game.isRevealed ? generationLabel : 'Hidden'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                {#if game.isRevealed && game.answer}
                  {#each game.answer.types as type}
                    <span class={`type ${type}`}>{type}</span>
                  {/each}
                {:else}
                  <span class="type hidden">???</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt>Best chain</dt>
              <dd>{game.bestStreak}</dd>
            </div>
          </dl>
        </div>

        {#if !game.loading && !game.loadError && game.currentRound}
          <div class="answers" aria-label="Answer choices">
            {#each game.currentRound.choices as choice, index}
              <button
                class={game.choiceClass(choice)}
                type="button"
                disabled={game.outcome !== 'idle'}
                onclick={() => game.answerChoice(choice)}
              >
                <span>{['A', 'B', 'C', 'D'][index]}</span>
                {choice.displayName}
              </button>
            {/each}
          </div>
        {/if}

        <div class="hardware-row">
          <div class="dpad" aria-hidden="true">
            <span></span>
          </div>
          {#if game.outcome === 'correct' && game.countdown !== null}
            <div
              class="auto-timer"
              style={`--timer-progress: ${(game.countdown / AUTO_ADVANCE_SECONDS) * 100}%`}
              aria-live="polite"
            >
              <span></span>
              <strong>{game.countdown}s</strong>
              <p>Next scan queued</p>
            </div>
          {/if}
          <button
            class="next-button"
            type="button"
            disabled={game.outcome === 'idle' || game.loading}
            onclick={() => game.nextRound()}
          >
            {game.isLastRound && game.outcome !== 'idle' ? 'New run' : 'Next scan'}
          </button>
        </div>
      </section>
    </div>
  </section>
</main>

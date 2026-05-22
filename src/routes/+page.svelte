<script lang="ts">
  import '../app.css';
  import { generations } from '$lib/data/pokemon';
  import type { GenerationId } from '$lib/data/types';
  import { getBestArtwork } from '$lib/data/pokemon-loader';
  import { GameController, AUTO_ADVANCE_SECONDS, defaultSettings } from '$lib/game';
  import { MODE_DEFINITIONS } from '$lib/modes';
  import { todayLabel } from '$lib/daily';

  const GENERATION_FILTERS: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const UNLOCKED_GENERATIONS: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const game = new GameController();
  let settingsOpen = $state(false);

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
    if (game.mode.timer.kind === 'countdown' && game.countdown !== null)
      return `⏱ ${game.countdown}s — Identify quickly!`;
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
      <div class="lid-left">
        <div class="lens-cluster" aria-hidden="true">
          <span class="lens main"></span>
          <span class="lens red"></span>
          <span class="lens amber"></span>
          <span class="lens green"></span>
        </div>
        <div class="title-block">
          <h1 id="game-title">Who's That Pokemon?</h1>
        </div>
      </div>

      <div class="lid-actions">
        <button
          class="icon-button settings-toggle"
          type="button"
          aria-label="Game settings"
          title="Mode & generation settings"
          onclick={() => settingsOpen = !settingsOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button
          class="icon-button reset-button"
          type="button"
          aria-label="Start a new game"
          title="Reset game"
          onclick={() => game.newGame()}
        >
          ↻
        </button>
      </div>
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
          class:revealed={game.isRevealed && !game.mode.silhouette.alwaysHidden}
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
              alt={game.isRevealed && !game.mode.silhouette.alwaysHidden ? game.answer.displayName : 'Mystery Pokemon silhouette'}
              onload={() => game.onImageLoaded()}
              onerror={(e) => {
                if (!game.answer) return;
                const img = e.currentTarget as HTMLImageElement;
                const fallback = game.answer.artwork.sprite ?? game.answer.artwork.fallback ?? '';
                if (img.src !== fallback) img.src = fallback;
                else {
                  // Both URLs failed — show broken-art placeholder
                  img.alt = game.isRevealed ? game.answer.displayName : '???';
                  img.removeAttribute('src');
                }
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
        <!-- Compact info bar: mode label + pokemon name + type -->
        <div class="info-bar">
          <span class="info-mode">{game.isDaily ? '📅 Daily' : game.mode.label}</span>
          <h2 class="info-name">{game.isRevealed && game.answer ? game.answer.displayName : '???'}</h2>
          <div class="info-types">
            {#if (game.isRevealed || game.mode.hints.showType) && game.answer}
              {#each game.answer.types as type}
                <span class={`type ${type}`}>{type}</span>
              {/each}
            {:else}
              <span class="type hidden">???</span>
            {/if}
          </div>
          {#if game.isRevealed || game.mode.hints.showRegion}
            <span class="info-region">{generationLabel}</span>
          {/if}
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
          {#if game.countdown !== null}
            {@const timerMax = game.mode.timer.kind === 'countdown'
              ? game.mode.timer.seconds
              : game.mode.timer.kind === 'auto-advance'
                ? game.mode.timer.seconds
                : AUTO_ADVANCE_SECONDS}
            <div
              class="auto-timer"
              class:countdown-active={game.mode.timer.kind === 'countdown' && game.outcome === 'idle'}
              class:countdown-danger={game.mode.timer.kind === 'countdown' && game.countdown <= 5}
              style={`--timer-progress: ${(game.countdown / timerMax) * 100}%`}
              aria-live="polite"
            >
              <span></span>
              <strong>{game.countdown}s</strong>
              <p>
                {#if game.mode.timer.kind === 'countdown' && game.outcome === 'idle'}
                  Time remaining
                {:else}
                  Next scan queued
                {/if}
              </p>
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

  <!-- Settings Modal -->
  {#if settingsOpen}
    <div class="modal-backdrop" onclick={() => settingsOpen = false} role="presentation"></div>
    <dialog class="settings-modal" open aria-label="Game settings">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="icon-button" type="button" aria-label="Close settings" onclick={() => settingsOpen = false}>✕</button>
      </div>

      <div class="modal-section">
        <h3>Game Mode</h3>
        <div class="mode-selector" aria-label="Game mode">
          {#each MODE_DEFINITIONS as modeDef}
            {@const isActive = game.activeMode === modeDef.id && !game.isDaily}
            <button
              class="mode-btn"
              class:active={isActive}
              type="button"
              title={modeDef.description}
              onclick={() => { game.selectMode(modeDef.id); settingsOpen = false; }}
            >
              {modeDef.label}
              <span class="mode-mult">{modeDef.scoringMultiplier}×</span>
            </button>
          {/each}

          <!-- Daily Challenge -->
          <button
            class="mode-btn daily-btn"
            class:active={game.isDaily}
            class:locked={game.isDailyPlayed && !game.isDaily}
            type="button"
            disabled={game.isDailyPlayed && !game.isDaily}
            title={game.isDailyPlayed ? 'Come back tomorrow!' : 'Same puzzle for everyone today'}
            onclick={() => { game.startDaily(); settingsOpen = false; }}
          >
            📅 Daily
            <span class="badge">{game.isDailyPlayed ? '✓ Done' : todayLabel()}</span>
          </button>
        </div>
      </div>

      <div class="modal-section">
        <h3>Generations</h3>
        <div class="mode-strip" aria-label="Generation filter">
          {#each GENERATION_FILTERS as id}
            {@const locked = !UNLOCKED_GENERATIONS.includes(id)}
            <button
              class:active={game.selectedGenerations.includes(id)}
              class:locked
              type="button"
              onclick={() => game.toggleGeneration(id, UNLOCKED_GENERATIONS)}
              title={`Generation ${id}`}
            >
              Gen {id}
            </button>
          {/each}
        </div>
      </div>

      <!-- Stats in modal -->
      {#if game.stats.overall.gamesPlayed > 0}
        {@const ov = game.stats.overall}
        <div class="modal-section">
          <h3>Stats</h3>
          <div class="stats-strip">
            <div><span>Played</span><strong>{ov.gamesPlayed}</strong></div>
            <div><span>Best score</span><strong>{ov.highScore}</strong></div>
            <div><span>Best chain</span><strong>{ov.bestStreak}</strong></div>
            <div>
              <span>Accuracy</span>
              <strong>
                {ov.totalCorrect + ov.totalMissed > 0
                  ? Math.round((ov.totalCorrect / (ov.totalCorrect + ov.totalMissed)) * 100) + '%'
                  : '—'}
              </strong>
            </div>
          </div>
        </div>
      {/if}
    </dialog>
  {/if}
</main>

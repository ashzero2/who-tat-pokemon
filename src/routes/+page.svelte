<script lang="ts">
  import '../app.css';
  import { artworkUrl, formatPokemonName, generations, pokemonRoster } from '$lib/data/pokemon';
  import type { GenerationId, PokemonSummary } from '$lib/data/pokemon';
  import { createRound, defaultSettings, scoreForAnswer } from '$lib/game';
  import type { GameRound } from '$lib/game';

  const generationFilters: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const unlockedGenerations: GenerationId[] = [1, 2];
  const autoAdvanceSeconds = 5;

  let selectedGenerations = $state<GenerationId[]>(defaultSettings.generations);
  let roundLimit = $state(defaultSettings.rounds);
  let roundNumber = $state(1);
  let score = $state(0);
  let streak = $state(0);
  let bestStreak = $state(0);
  let outcome = $state<'idle' | 'correct' | 'miss'>('idle');
  let selectedId = $state<number | null>(null);
  let usedIds = $state(new Set<number>());
  let imageReady = $state(false);
  let countdown = $state<number | null>(null);
  let autoAdvanceTimer: ReturnType<typeof setInterval> | null = null;

  let playableRoster = $derived(
    pokemonRoster.filter((entry) => selectedGenerations.includes(entry.generation))
  );

  let currentRound = $state<GameRound>(createRound(pokemonRoster, new Set<number>()));
  let answer = $derived(currentRound.answer);
  let isRevealed = $derived(outcome !== 'idle');
  let generationLabel = $derived(
    generations.find((generation) => generation.id === answer.generation)?.label ?? 'Unknown'
  );
  let progress = $derived((roundNumber / roundLimit) * 100);

  function clearAutoAdvance() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    countdown = null;
  }

  function scheduleAutoAdvance() {
    clearAutoAdvance();
    countdown = autoAdvanceSeconds;

    autoAdvanceTimer = setInterval(() => {
      if (countdown === null) return;

      if (countdown <= 1) {
        clearAutoAdvance();
        nextRound();
        return;
      }

      countdown -= 1;
    }, 1000);
  }

  function resetImage() {
    imageReady = false;
    requestAnimationFrame(() => {
      imageReady = true;
    });
  }

  function startRound() {
    clearAutoAdvance();
    outcome = 'idle';
    selectedId = null;
    currentRound = createRound(playableRoster, usedIds);
    usedIds.add(currentRound.answer.id);
    resetImage();
  }

  function newGame() {
    clearAutoAdvance();
    roundNumber = 1;
    score = 0;
    streak = 0;
    bestStreak = 0;
    outcome = 'idle';
    selectedId = null;
    usedIds = new Set();
    currentRound = createRound(playableRoster, usedIds);
    usedIds.add(currentRound.answer.id);
    resetImage();
  }

  function answerChoice(choice: PokemonSummary) {
    if (outcome !== 'idle') return;

    selectedId = choice.id;
    const correct = choice.id === answer.id;
    outcome = correct ? 'correct' : 'miss';
    score += scoreForAnswer(correct, streak);
    streak = correct ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);

    if (correct) scheduleAutoAdvance();
  }

  function nextRound() {
    if (outcome === 'idle') return;

    clearAutoAdvance();

    if (roundNumber >= roundLimit) {
      newGame();
      return;
    }

    roundNumber += 1;
    startRound();
  }

  function toggleGeneration(id: GenerationId) {
    if (!unlockedGenerations.includes(id)) return;

    const nextSelection = selectedGenerations.includes(id)
      ? selectedGenerations.filter((generation) => generation !== id)
      : [...selectedGenerations, id];

    selectedGenerations = nextSelection.length ? nextSelection : defaultSettings.generations;
    newGame();
  }

  function choiceClass(choice: PokemonSummary) {
    if (outcome === 'idle') return '';
    if (choice.id === answer.id) return 'correct';
    if (choice.id === selectedId) return 'wrong';
    return 'dimmed';
  }

  function statusText() {
    if (outcome === 'correct' && countdown !== null) return `Registered. Next scan in ${countdown}s.`;
    if (outcome === 'correct') return 'Registered. Clean read on the silhouette.';
    if (outcome === 'miss') return `Signal resolved: ${formatPokemonName(answer.name)}.`;
    return 'Scanner locked. Identify the silhouette.';
  }

  newGame();
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

      <button class="reset-button" type="button" aria-label="Start a new game" onclick={newGame}>
        RESET
      </button>
    </div>

    <div class="console-body">
      <section class="left-deck" aria-label="Mystery Pokemon scanner">
        <div class="scanner-meta">
          <div>
            <span>Round</span>
            <strong>{roundNumber}/{roundLimit}</strong>
          </div>
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Streak</span>
            <strong>{streak}</strong>
          </div>
        </div>

        <div class:revealed={isRevealed} class:ready={imageReady} class="scanner-screen">
          <div class="screen-grid" aria-hidden="true"></div>
          <div class="target-ring" aria-hidden="true"></div>
          <img
            src={artworkUrl(answer.id)}
            alt={isRevealed ? formatPokemonName(answer.name) : 'Mystery Pokemon silhouette'}
            onload={() => (imageReady = true)}
          />
          <div class="screen-footer">
            <span>{statusText()}</span>
            <span>{String(answer.id).padStart(3, '0')}</span>
          </div>
        </div>

        <div class="progress-track" aria-label="Round progress">
          <span style={`width: ${progress}%`}></span>
        </div>
      </section>

      <section class="right-deck" aria-label="Game controls">
        <div class="mode-strip" aria-label="Generation filter">
          {#each generationFilters as id}
            <button
              class:active={selectedGenerations.includes(id)}
              class:locked={!unlockedGenerations.includes(id)}
              type="button"
              aria-label={`Generation ${id}${
                !unlockedGenerations.includes(id) ? ' locked for future expansion' : ''
              }`}
              onclick={() => toggleGeneration(id)}
              title={unlockedGenerations.includes(id) ? `Generation ${id} roster` : 'Coming soon'}
            >
              {id}
            </button>
          {/each}
        </div>

        <div class="dex-readout">
          <p>Dex readout</p>
          <h2>{isRevealed ? formatPokemonName(answer.name) : 'Unknown'}</h2>
          <dl>
            <div>
              <dt>Region</dt>
              <dd>{isRevealed ? generationLabel : 'Hidden'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                {#if isRevealed}
                  {#each answer.types as type}
                    <span class={`type ${type}`}>{type}</span>
                  {/each}
                {:else}
                  <span class="type hidden">???</span>
                {/if}
              </dd>
            </div>
            <div>
              <dt>Best chain</dt>
              <dd>{bestStreak}</dd>
            </div>
          </dl>
        </div>

        <div class="answers" aria-label="Answer choices">
          {#each currentRound.choices as choice, index}
            <button
              class={choiceClass(choice)}
              type="button"
              disabled={outcome !== 'idle'}
              onclick={() => answerChoice(choice)}
            >
              <span>{['A', 'B', 'C', 'D'][index]}</span>
              {formatPokemonName(choice.name)}
            </button>
          {/each}
        </div>

        <div class="hardware-row">
          <div class="dpad" aria-hidden="true">
            <span></span>
          </div>
          {#if outcome === 'correct' && countdown !== null}
            <div
              class="auto-timer"
              style={`--timer-progress: ${(countdown / autoAdvanceSeconds) * 100}%`}
              aria-live="polite"
            >
              <span></span>
              <strong>{countdown}s</strong>
              <p>Next scan queued</p>
            </div>
          {/if}
          <button class="next-button" type="button" disabled={outcome === 'idle'} onclick={nextRound}>
            {roundNumber >= roundLimit && outcome !== 'idle' ? 'New run' : 'Next scan'}
          </button>
        </div>
      </section>
    </div>
  </section>
</main>

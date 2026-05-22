import type { GenerationId, PokemonEntry } from '$lib/data/types';
import { loadGenerations } from '$lib/data/pokemon-loader';
import { preloadEntry, preloadQueue, peekQueue } from '$lib/assets/preload';
import { playCry } from '$lib/assets/cry';
import { getModeDefinition } from '$lib/modes';
import type { ModeId } from '$lib/modes';
import { recordGame, loadStats } from '$lib/stats/local-stats';
import type { LocalStats } from '$lib/stats/local-stats';
import { dailySeedForDate, dailyRoundIds, todayLabel } from '$lib/daily';
import { AUTO_ADVANCE_SECONDS, createRound, defaultSettings, scoreForAnswer, shuffle } from './engine';
import type { GameRound, RoundOptions, RoundOutcome } from './engine';

const DAILY_PLAYED_KEY = 'pokedex-daily-played';

/** Number of future rounds to peek ahead and preload artwork for. */
const PRELOAD_AHEAD = 2;

export class GameController {
	// ── Roster / loading ──────────────────────────────────────────────────────
	roster = $state<PokemonEntry[]>([]);
	loading = $state(false);
	loadError = $state<string | null>(null);

	// ── Mode ─────────────────────────────────────────────────────────────────
	activeMode = $state<ModeId>('classic');
	isDaily = $state(false);
	dailyCompleted = $state(false);

	get mode() {
		return getModeDefinition(this.activeMode);
	}

	selectMode(id: ModeId) {
		const def = getModeDefinition(id);
		if (def.status !== 'available') return; // locked / preview modes cannot start
		this.isDaily = false;
		this.dailyCompleted = false;
		this.activeMode = id;
		this.roundLimit = def.rounds;
		this.newGame();
	}

	// ── Settings ──────────────────────────────────────────────────────────────
	selectedGenerations = $state<GenerationId[]>([...defaultSettings.generations]);
	roundLimit = $state(defaultSettings.rounds);

	// ── Round state ───────────────────────────────────────────────────────────
	roundNumber = $state(1);
	usedIds = $state(new Set<number>());
	currentRound = $state<GameRound | null>(null);

	// ── Outcome ───────────────────────────────────────────────────────────────
	outcome = $state<RoundOutcome>('idle');
	selectedId = $state<number | null>(null);
	imageReady = $state(false);

	// ── Countdown ─────────────────────────────────────────────────────────────
	countdown = $state<number | null>(null);

	// ── Score ─────────────────────────────────────────────────────────────────
	score = $state(0);
	streak = $state(0);
	bestStreak = $state(0);

	// ── In-game answer tracking ───────────────────────────────────────────────
	totalCorrect = $state(0);
	totalMissed = $state(0);

	// ── Daily challenge queue ─────────────────────────────────────────────────
	private _dailyQueue: PokemonEntry[] = [];
	private _dailyIndex = 0;

	// ── Persisted stats ───────────────────────────────────────────────────────
	stats = $state<LocalStats>(loadStats());

	// Non-reactive private timer handle
	private _timer: ReturnType<typeof setInterval> | null = null;

	// ── Derived getters ───────────────────────────────────────────────────────

	get playableRoster(): PokemonEntry[] {
		return this.roster.filter((e) => this.selectedGenerations.includes(e.generation));
	}

	get answer(): PokemonEntry | null {
		return this.currentRound?.answer ?? null;
	}

	get isRevealed(): boolean {
		return this.outcome !== 'idle';
	}

	get progress(): number {
		return (this.roundNumber / this.roundLimit) * 100;
	}

	get isLastRound(): boolean {
		return this.roundNumber >= this.roundLimit;
	}

	// ── Timer ─────────────────────────────────────────────────────────────────

	clearTimer() {
		if (this._timer) {
			clearInterval(this._timer);
			this._timer = null;
		}
		this.countdown = null;
	}

	/** Start the appropriate post-answer timer based on the active mode. */
	private schedulePostAnswerTimer() {
		const timer = this.mode.timer;
		if (timer.kind === 'none') return; // Hard Mode: no auto-advance
		if (timer.kind === 'auto-advance') {
			this.clearTimer();
			this.countdown = timer.seconds;
			this._timer = setInterval(() => {
				if (this.countdown === null) return;
				if (this.countdown <= 1) {
					this.clearTimer();
					this.nextRound();
					return;
				}
				this.countdown -= 1;
			}, 1000);
		}
		// countdown timer is handled by startCountdownTimer()
	}

	// ── Countdown timer (Timed mode) ─────────────────────────────────────────

	/** Per-round countdown that auto-misses when time expires. */
	private startCountdownTimer() {
		const timer = this.mode.timer;
		if (timer.kind !== 'countdown') return;
		this.clearTimer();
		this.countdown = timer.seconds;
		this._timer = setInterval(() => {
			if (this.countdown === null) return;
			if (this.countdown <= 1) {
				this.clearTimer();
				// Time ran out — treat as a miss
				if (this.outcome === 'idle' && this.answer) {
					this.outcome = 'miss';
					this.streak = 0;
					this.totalMissed += 1;
				}
				return;
			}
			this.countdown -= 1;
		}, 1000);
	}

	/** Penalise wrong answer in countdown mode by deducting seconds. */
	private penaliseCountdown(seconds: number) {
		if (this.countdown !== null) {
			this.countdown = Math.max(0, this.countdown - seconds);
		}
	}

	// ── Preload queue ─────────────────────────────────────────────────────────

	/** Peek ahead and preload the next N likely artwork URLs. */
	preloadAhead() {
		const queue = peekQueue(this.playableRoster, this.usedIds, PRELOAD_AHEAD);
		preloadQueue(queue, PRELOAD_AHEAD);
	}

	// ── Image ─────────────────────────────────────────────────────────────────

	resetImage() {
		this.imageReady = false;
		requestAnimationFrame(() => {
			this.imageReady = true;
		});
	}

	/** Called by the UI when the current round image finishes loading. */
	onImageLoaded() {
		this.imageReady = true;
		// Once the current image is shown, warm the cache for upcoming rounds
		this.preloadAhead();
	}

	// ── Game flow ─────────────────────────────────────────────────────────────

	/** Build round options from the active mode definition. */
	private get roundOptions(): RoundOptions {
		return {
			regionLock: this.activeMode === 'region-lock'
		};
	}

	startRound() {
		if (this.playableRoster.length === 0) return;
		this.clearTimer();
		this.outcome = 'idle';
		this.selectedId = null;
		this.currentRound = createRound(this.playableRoster, this.usedIds, this.roundOptions);
		this.usedIds.add(this.currentRound.answer.id);
		// Preload current round image immediately
		preloadEntry(this.currentRound.answer);
		this.resetImage();
		// Start per-round countdown if in Timed mode
		this.startCountdownTimer();
	}

	newGame(recordPrevious = false) {
		if (this.playableRoster.length === 0) return;
		this.clearTimer();

		// Persist stats for the game that just ended
		if (recordPrevious && this.score > 0) {
			this.stats = recordGame(
				this.activeMode,
				this.score,
				this.bestStreak,
				this.totalCorrect,
				this.totalMissed
			);
		}

		this.roundNumber = 1;
		this.score = 0;
		this.streak = 0;
		this.bestStreak = 0;
		this.totalCorrect = 0;
		this.totalMissed = 0;
		this.outcome = 'idle';
		this.selectedId = null;
		this.usedIds = new Set();
		this.currentRound = createRound(this.playableRoster, this.usedIds, this.roundOptions);
		this.usedIds.add(this.currentRound.answer.id);
		// Preload current round image immediately
		preloadEntry(this.currentRound.answer);
		this.resetImage();
		// Start per-round countdown if in Timed mode
		this.startCountdownTimer();
	}

	answerChoice(choice: PokemonEntry) {
		if (this.outcome !== 'idle' || !this.answer) return;
		this.selectedId = choice.id;
		const correct = choice.id === this.answer.id;
		this.outcome = correct ? 'correct' : 'miss';
		this.score += scoreForAnswer(correct, this.streak, this.mode.scoringMultiplier);
		this.streak = correct ? this.streak + 1 : 0;
		this.bestStreak = Math.max(this.bestStreak, this.streak);
		if (correct) {
			this.totalCorrect += 1;
			// Play the Pokémon's cry on correct answer
			playCry(this.answer.pokemonApiId);
			this.schedulePostAnswerTimer();
		} else {
			this.totalMissed += 1;
			// In countdown mode, wrong answer costs 3 seconds
			if (this.mode.timer.kind === 'countdown') {
				this.penaliseCountdown(3);
			}
		}
	}

	nextRound() {
		if (this.outcome === 'idle') return;
		this.clearTimer();

		// Daily challenge uses its own deterministic round flow
		if (this.isDaily) {
			if (this.isLastRound) {
				this.nextDailyRound(); // will mark as complete
				return;
			}
			this.nextDailyRound();
			return;
		}

		if (this.isLastRound) {
			this.newGame(true); // persist stats for the completed game
			return;
		}
		this.roundNumber += 1;
		this.startRound();
	}

	toggleGeneration(id: GenerationId, unlocked: GenerationId[]) {
		if (!unlocked.includes(id)) return;
		const next = this.selectedGenerations.includes(id)
			? this.selectedGenerations.filter((g) => g !== id)
			: [...this.selectedGenerations, id];
		this.selectedGenerations = next.length ? next : [...defaultSettings.generations];
		this.loadRoster(this.selectedGenerations);
	}

	async loadRoster(gens: GenerationId[]) {
		this.loading = true;
		this.loadError = null;
		try {
			this.roster = await loadGenerations(gens);
			this.newGame();
		} catch (err) {
			this.loadError = err instanceof Error ? err.message : 'Failed to load Pokémon data.';
		} finally {
			this.loading = false;
		}
	}

	// ── Daily challenge ───────────────────────────────────────────────────────

	/** Check if today's daily challenge has already been played. */
	get isDailyPlayed(): boolean {
		try {
			const played = localStorage.getItem(DAILY_PLAYED_KEY);
			return played === todayLabel();
		} catch {
			return false;
		}
	}

	/** Mark today's daily challenge as completed. */
	private markDailyPlayed() {
		try {
			localStorage.setItem(DAILY_PLAYED_KEY, todayLabel());
		} catch {
			// Private browsing or quota — silently ignore
		}
	}

	/** Create a daily round from the pre-built deterministic queue. */
	private createDailyRound(): GameRound {
		const answer = this._dailyQueue[this._dailyIndex];
		const decoyPool = this.playableRoster.filter((e) => e.id !== answer.id);
		const decoys = shuffle(decoyPool).slice(0, 3);
		return { answer, choices: shuffle([answer, ...decoys]) };
	}

	/** Start the daily challenge using today's seed. */
	async startDaily() {
		if (this.isDailyPlayed) {
			this.dailyCompleted = true;
			return;
		}

		this.isDaily = true;
		this.dailyCompleted = false;
		this.activeMode = 'classic'; // Daily uses Classic rules
		this.roundLimit = 10;

		// Ensure we have a full roster loaded (all generations for variety)
		const allGens: GenerationId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		this.loading = true;
		this.loadError = null;
		try {
			this.roster = await loadGenerations(allGens);
			this.selectedGenerations = [...allGens];
		} catch (err) {
			this.loadError = err instanceof Error ? err.message : 'Failed to load Pokémon data.';
			this.loading = false;
			return;
		}
		this.loading = false;

		// Generate deterministic round IDs from today's seed
		const seed = dailySeedForDate();
		const guessable = this.playableRoster;
		const ids = dailyRoundIds(guessable, seed, this.roundLimit);
		const idLookup = new Map(guessable.map((e) => [e.id, e]));
		this._dailyQueue = ids.map((id) => idLookup.get(id)!).filter(Boolean);
		this._dailyIndex = 0;

		// Fallback if not enough entries
		if (this._dailyQueue.length === 0) {
			this.loadError = 'Not enough Pokémon for daily challenge.';
			return;
		}
		this.roundLimit = Math.min(this.roundLimit, this._dailyQueue.length);

		// Reset game state
		this.clearTimer();
		this.roundNumber = 1;
		this.score = 0;
		this.streak = 0;
		this.bestStreak = 0;
		this.totalCorrect = 0;
		this.totalMissed = 0;
		this.outcome = 'idle';
		this.selectedId = null;
		this.usedIds = new Set();

		// Create first daily round
		this.currentRound = this.createDailyRound();
		this.usedIds.add(this.currentRound.answer.id);
		preloadEntry(this.currentRound.answer);
		this.resetImage();
	}

	/** Start the next daily round or finish. */
	private nextDailyRound() {
		this._dailyIndex += 1;
		if (this._dailyIndex >= this._dailyQueue.length || this.roundNumber >= this.roundLimit) {
			// Daily challenge complete
			this.markDailyPlayed();
			this.dailyCompleted = true;
			this.stats = recordGame(
				this.activeMode,
				this.score,
				this.bestStreak,
				this.totalCorrect,
				this.totalMissed
			);
			// Reset to classic mode after daily
			this.isDaily = false;
			this.newGame();
			return;
		}
		this.roundNumber += 1;
		this.clearTimer();
		this.outcome = 'idle';
		this.selectedId = null;
		this.currentRound = this.createDailyRound();
		this.usedIds.add(this.currentRound.answer.id);
		preloadEntry(this.currentRound.answer);
		this.resetImage();
	}

	choiceClass(choice: PokemonEntry): string {
		if (this.outcome === 'idle' || !this.answer) return '';
		if (choice.id === this.answer.id) return 'correct';
		if (choice.id === this.selectedId) return 'wrong';
		return 'dimmed';
	}
}

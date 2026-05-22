import type { GenerationId, PokemonEntry } from '$lib/data/types';
import { loadGenerations } from '$lib/data/pokemon-loader';
import { AUTO_ADVANCE_SECONDS, createRound, defaultSettings, scoreForAnswer } from './engine';
import type { GameRound, RoundOutcome } from './engine';

export class GameController {
	// ── Roster / loading ──────────────────────────────────────────────────────
	roster = $state<PokemonEntry[]>([]);
	loading = $state(false);
	loadError = $state<string | null>(null);

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

	private scheduleAutoAdvance() {
		this.clearTimer();
		this.countdown = AUTO_ADVANCE_SECONDS;
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

	// ── Image ─────────────────────────────────────────────────────────────────

	resetImage() {
		this.imageReady = false;
		requestAnimationFrame(() => {
			this.imageReady = true;
		});
	}

	// ── Game flow ─────────────────────────────────────────────────────────────

	startRound() {
		if (this.playableRoster.length === 0) return;
		this.clearTimer();
		this.outcome = 'idle';
		this.selectedId = null;
		this.currentRound = createRound(this.playableRoster, this.usedIds);
		this.usedIds.add(this.currentRound.answer.id);
		this.resetImage();
	}

	newGame() {
		if (this.playableRoster.length === 0) return;
		this.clearTimer();
		this.roundNumber = 1;
		this.score = 0;
		this.streak = 0;
		this.bestStreak = 0;
		this.outcome = 'idle';
		this.selectedId = null;
		this.usedIds = new Set();
		this.currentRound = createRound(this.playableRoster, this.usedIds);
		this.usedIds.add(this.currentRound.answer.id);
		this.resetImage();
	}

	answerChoice(choice: PokemonEntry) {
		if (this.outcome !== 'idle' || !this.answer) return;
		this.selectedId = choice.id;
		const correct = choice.id === this.answer.id;
		this.outcome = correct ? 'correct' : 'miss';
		this.score += scoreForAnswer(correct, this.streak);
		this.streak = correct ? this.streak + 1 : 0;
		this.bestStreak = Math.max(this.bestStreak, this.streak);
		if (correct) this.scheduleAutoAdvance();
	}

	nextRound() {
		if (this.outcome === 'idle') return;
		this.clearTimer();
		if (this.isLastRound) {
			this.newGame();
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

	choiceClass(choice: PokemonEntry): string {
		if (this.outcome === 'idle' || !this.answer) return '';
		if (choice.id === this.answer.id) return 'correct';
		if (choice.id === this.selectedId) return 'wrong';
		return 'dimmed';
	}
}

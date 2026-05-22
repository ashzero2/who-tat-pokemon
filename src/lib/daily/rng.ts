/**
 * Deterministic seeded pseudo-random number generator.
 * Uses a simple 32-bit Mulberry32 PRNG — fast, good distribution,
 * and fully reproducible from a numeric seed.
 */
export class SeededRng {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0; // coerce to uint32
	}

	/** Returns a float in [0, 1). */
	next(): number {
		this.state |= 0;
		this.state = (this.state + 0x6d2b79f5) | 0;
		let z = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
		z = (z ^ (z + Math.imul(z ^ (z >>> 7), 61 | z))) >>> 0;
		return (z ^ (z >>> 14)) / 4294967296;
	}

	/** Returns an integer in [0, max). */
	nextInt(max: number): number {
		return Math.floor(this.next() * max);
	}

	/** Shuffles a copy of the array using Fisher-Yates. */
	shuffle<T>(items: T[]): T[] {
		const arr = [...items];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = this.nextInt(i + 1);
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}
}

export type ModeId =
	| 'classic'
	| 'timed'
	| 'region-lock'
	| 'type-hint'
	| 'silhouette-hard';

export type ModeStatus = 'available' | 'locked' | 'preview';

export type TimerBehavior =
	| { kind: 'none' }
	| { kind: 'auto-advance'; seconds: number }
	| { kind: 'countdown'; seconds: number };

export type HintConfig = {
	/** Show the Pokémon's type(s) before reveal */
	showType: boolean;
	/** Show the generation/region before reveal */
	showRegion: boolean;
};

export type SilhouetteConfig = {
	/** If true the silhouette is never revealed before the answer */
	alwaysHidden: boolean;
};

export type ModeDefinition = {
	id: ModeId;
	label: string;
	description: string;
	status: ModeStatus;

	/** Total rounds per game */
	rounds: number;

	/** Timer / auto-advance behaviour */
	timer: TimerBehavior;

	/** Scoring multiplier applied on top of the base score */
	scoringMultiplier: number;

	/** Hint visibility config */
	hints: HintConfig;

	/** Silhouette display config */
	silhouette: SilhouetteConfig;
};

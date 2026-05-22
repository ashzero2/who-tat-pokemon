import type { ModeDefinition, ModeId } from './types';

export const MODE_DEFINITIONS: ModeDefinition[] = [
	{
		id: 'classic',
		label: 'Classic',
		description: 'Ten rounds, silhouette reveal on correct answer, 5-second auto-advance.',
		status: 'available',
		rounds: 10,
		timer: { kind: 'auto-advance', seconds: 5 },
		scoringMultiplier: 1,
		hints: { showType: false, showRegion: false },
		silhouette: { alwaysHidden: false }
	},
	{
		id: 'timed',
		label: 'Timed',
		description: 'Race against a per-round countdown. Wrong guess costs seconds.',
		status: 'preview',
		rounds: 10,
		timer: { kind: 'countdown', seconds: 15 },
		scoringMultiplier: 1.5,
		hints: { showType: false, showRegion: false },
		silhouette: { alwaysHidden: false }
	},
	{
		id: 'region-lock',
		label: 'Region Lock',
		description: 'All choices come from the same generation as the answer.',
		status: 'locked',
		rounds: 10,
		timer: { kind: 'auto-advance', seconds: 5 },
		scoringMultiplier: 1.25,
		hints: { showType: false, showRegion: true },
		silhouette: { alwaysHidden: false }
	},
	{
		id: 'type-hint',
		label: 'Type Hint',
		description: "The Pokémon's type badge is shown — but the roster is larger.",
		status: 'locked',
		rounds: 15,
		timer: { kind: 'auto-advance', seconds: 5 },
		scoringMultiplier: 0.85,
		hints: { showType: true, showRegion: false },
		silhouette: { alwaysHidden: false }
	},
	{
		id: 'silhouette-hard',
		label: 'Hard Mode',
		description: 'Silhouette is never revealed — answer purely from shape.',
		status: 'locked',
		rounds: 10,
		timer: { kind: 'none' },
		scoringMultiplier: 2,
		hints: { showType: false, showRegion: false },
		silhouette: { alwaysHidden: true }
	}
];

export const MODES_BY_ID: Record<ModeId, ModeDefinition> = Object.fromEntries(
	MODE_DEFINITIONS.map((m) => [m.id, m])
) as Record<ModeId, ModeDefinition>;

export function getModeDefinition(id: ModeId): ModeDefinition {
	return MODES_BY_ID[id];
}

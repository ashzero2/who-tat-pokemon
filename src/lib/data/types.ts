export type GenerationId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export type Generation = {
  id: GenerationId;
  label: string;
  range: [number, number];
};

export type PokemonArtwork = {
  official: string | null;
  home: string | null;
  sprite: string | null;
  fallback: string | null;
};

export type PokemonEntry = {
  id: number;
  speciesId: number;
  pokemonApiId: number;
  name: string;
  displayName: string;
  generation: GenerationId;
  types: PokemonType[];
  isDefault: boolean;
  formName: string | null;
  aliases: string[];
  artwork: PokemonArtwork;
  guessable: boolean;
};

export type PokemonGenerationChunk = {
  schemaVersion: number;
  generation: Generation;
  entries: PokemonEntry[];
};

export type PokemonDataManifest = {
  schemaVersion: number;
  generatedAt: string;
  totalEntries: number;
  guessableEntries: number;
  generations: Array<
    Generation & {
      chunk: string;
      entries: number;
      guessableEntries: number;
    }
  >;
};

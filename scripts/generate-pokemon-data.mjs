import { writeFile } from 'node:fs/promises';

const limit = Number.parseInt(process.argv[2] ?? '251', 10);
const outputPath = new URL('../src/lib/data/pokemon.ts', import.meta.url);

const generations = [
  { id: 1, label: 'Kanto', range: [1, 151] },
  { id: 2, label: 'Johto', range: [152, 251] },
  { id: 3, label: 'Hoenn', range: [252, 386] },
  { id: 4, label: 'Sinnoh', range: [387, 493] },
  { id: 5, label: 'Unova', range: [494, 649] },
  { id: 6, label: 'Kalos', range: [650, 721] },
  { id: 7, label: 'Alola', range: [722, 809] },
  { id: 8, label: 'Galar', range: [810, 905] },
  { id: 9, label: 'Paldea', range: [906, 1025] }
];

function generationForId(id) {
  const generation = generations.find((entry) => id >= entry.range[0] && id <= entry.range[1]);
  if (!generation) throw new Error(`No generation range for Pokemon id ${id}`);
  return generation.id;
}

async function fetchPokemon(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Pokemon ${id}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    generation: generationForId(data.id),
    types: data.types
      .sort((first, second) => first.slot - second.slot)
      .map((entry) => entry.type.name)
  };
}

function serializeRoster(roster) {
  return roster
    .map(
      (pokemon) =>
        `  { id: ${pokemon.id}, name: '${pokemon.name}', generation: ${pokemon.generation}, types: [${pokemon.types
          .map((type) => `'${type}'`)
          .join(', ')}] }`
    )
    .join(',\n');
}

const roster = await Promise.all(
  Array.from({ length: limit }, (_, index) => fetchPokemon(index + 1))
);

const content = `export type GenerationId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type PokemonSummary = {
  id: number;
  name: string;
  generation: GenerationId;
  types: string[];
};

export type Generation = {
  id: GenerationId;
  label: string;
  range: [number, number];
};

export const generations: Generation[] = ${JSON.stringify(generations, null, 2).replace(
  /"([^"]+)":/g,
  '$1:'
)} as Generation[];

export const pokemonRoster: PokemonSummary[] = [
${serializeRoster(roster)}
];

export const artworkUrl = (id: number) =>
  \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/\${id}.png\`;

export const formatPokemonName = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
`;

await writeFile(outputPath, content);
console.log(`Wrote ${roster.length} Pokemon to ${outputPath.pathname}`);

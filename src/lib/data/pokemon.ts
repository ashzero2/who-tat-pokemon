export type GenerationId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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

export const generations: Generation[] = [
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

export const pokemonRoster: PokemonSummary[] = [
  { id: 1, name: 'bulbasaur', generation: 1, types: ['grass', 'poison'] },
  { id: 3, name: 'venusaur', generation: 1, types: ['grass', 'poison'] },
  { id: 4, name: 'charmander', generation: 1, types: ['fire'] },
  { id: 6, name: 'charizard', generation: 1, types: ['fire', 'flying'] },
  { id: 7, name: 'squirtle', generation: 1, types: ['water'] },
  { id: 9, name: 'blastoise', generation: 1, types: ['water'] },
  { id: 25, name: 'pikachu', generation: 1, types: ['electric'] },
  { id: 26, name: 'raichu', generation: 1, types: ['electric'] },
  { id: 37, name: 'vulpix', generation: 1, types: ['fire'] },
  { id: 39, name: 'jigglypuff', generation: 1, types: ['normal', 'fairy'] },
  { id: 52, name: 'meowth', generation: 1, types: ['normal'] },
  { id: 54, name: 'psyduck', generation: 1, types: ['water'] },
  { id: 58, name: 'growlithe', generation: 1, types: ['fire'] },
  { id: 63, name: 'abra', generation: 1, types: ['psychic'] },
  { id: 66, name: 'machop', generation: 1, types: ['fighting'] },
  { id: 74, name: 'geodude', generation: 1, types: ['rock', 'ground'] },
  { id: 79, name: 'slowpoke', generation: 1, types: ['water', 'psychic'] },
  { id: 92, name: 'gastly', generation: 1, types: ['ghost', 'poison'] },
  { id: 94, name: 'gengar', generation: 1, types: ['ghost', 'poison'] },
  { id: 104, name: 'cubone', generation: 1, types: ['ground'] },
  { id: 113, name: 'chansey', generation: 1, types: ['normal'] },
  { id: 123, name: 'scyther', generation: 1, types: ['bug', 'flying'] },
  { id: 129, name: 'magikarp', generation: 1, types: ['water'] },
  { id: 130, name: 'gyarados', generation: 1, types: ['water', 'flying'] },
  { id: 131, name: 'lapras', generation: 1, types: ['water', 'ice'] },
  { id: 133, name: 'eevee', generation: 1, types: ['normal'] },
  { id: 143, name: 'snorlax', generation: 1, types: ['normal'] },
  { id: 144, name: 'articuno', generation: 1, types: ['ice', 'flying'] },
  { id: 145, name: 'zapdos', generation: 1, types: ['electric', 'flying'] },
  { id: 146, name: 'moltres', generation: 1, types: ['fire', 'flying'] },
  { id: 149, name: 'dragonite', generation: 1, types: ['dragon', 'flying'] },
  { id: 150, name: 'mewtwo', generation: 1, types: ['psychic'] }
];

export const artworkUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const formatPokemonName = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

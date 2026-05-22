import { mkdir, writeFile } from 'node:fs/promises';

const schemaVersion = 1;
const maxSpeciesId = Number.parseInt(process.argv[2] ?? '1025', 10);
const outputDir = new URL('../static/data/pokemon/', import.meta.url);

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

const fallbackArtworkBase =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

function generationForSpecies(speciesId) {
  const generation = generations.find((entry) => speciesId >= entry.range[0] && speciesId <= entry.range[1]);
  if (!generation) throw new Error(`No generation range for species ${speciesId}`);
  return generation.id;
}

function idFromUrl(url) {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new Error(`Unable to parse id from ${url}`);
  return Number.parseInt(match[1], 10);
}

function formatName(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formLabel(speciesName, pokemonName, isDefault) {
  if (isDefault || pokemonName === speciesName) return null;

  const cleaned = pokemonName
    .replace(`${speciesName}-`, '')
    .replace(/-totem$/, ' totem')
    .replace(/-gmax$/, ' gigantamax')
    .replace(/-starter$/, ' starter')
    .replace(/-build$/, ' build');

  return formatName(cleaned);
}

function uniqueAliases(values) {
  return [...new Set(values.map((value) => value.toLowerCase()).filter(Boolean))];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed ${url}: ${response.status} ${response.statusText}`);
  return response.json();
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function buildEntry(species, variety) {
  const pokemonApiId = idFromUrl(variety.pokemon.url);
  const pokemon = await fetchJson(variety.pokemon.url);
  const artwork = {
    official: pokemon.sprites?.other?.['official-artwork']?.front_default ?? null,
    home: pokemon.sprites?.other?.home?.front_default ?? null,
    sprite: pokemon.sprites?.front_default ?? null,
    fallback: pokemonApiId < 10000 ? `${fallbackArtworkBase}/${pokemonApiId}.png` : null
  };
  const formName = formLabel(species.name, pokemon.name, variety.is_default);
  const displayName = formName ? `${formatName(species.name)} (${formName})` : formatName(species.name);
  const aliases = uniqueAliases([
    pokemon.name,
    species.name,
    displayName,
    formName ?? '',
    formatName(pokemon.name)
  ]);

  return {
    id: pokemonApiId,
    speciesId: species.id,
    pokemonApiId,
    name: pokemon.name,
    displayName,
    generation: generationForSpecies(species.id),
    types: pokemon.types
      .sort((first, second) => first.slot - second.slot)
      .map((entry) => entry.type.name),
    isDefault: variety.is_default,
    formName,
    aliases,
    artwork,
    guessable: Boolean(artwork.official || artwork.home || artwork.sprite || artwork.fallback)
  };
}

await mkdir(outputDir, { recursive: true });

const speciesList = await mapWithConcurrency(
  Array.from({ length: maxSpeciesId }, (_, index) => index + 1),
  12,
  (speciesId) => fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`)
);

const nestedEntries = await mapWithConcurrency(speciesList, 8, async (species) => {
  const varieties = species.varieties.filter((variety) => {
    const pokemonApiId = idFromUrl(variety.pokemon.url);
    return pokemonApiId < 10000 || !variety.is_default;
  });

  return mapWithConcurrency(varieties, 6, (variety) => buildEntry(species, variety));
});

const entries = nestedEntries.flat().sort((first, second) => first.speciesId - second.speciesId || first.id - second.id);

const manifest = {
  schemaVersion,
  generatedAt: new Date().toISOString(),
  totalEntries: entries.length,
  guessableEntries: entries.filter((entry) => entry.guessable).length,
  generations: generations.map((generation) => {
    const generationEntries = entries.filter((entry) => entry.generation === generation.id);
    return {
      ...generation,
      chunk: `gen-${generation.id}.json`,
      entries: generationEntries.length,
      guessableEntries: generationEntries.filter((entry) => entry.guessable).length
    };
  })
};

await writeFile(new URL('index.json', outputDir), `${JSON.stringify(manifest, null, 2)}\n`);

for (const generation of generations) {
  const generationEntries = entries.filter((entry) => entry.generation === generation.id);
  const chunk = {
    schemaVersion,
    generation,
    entries: generationEntries
  };

  await writeFile(new URL(`gen-${generation.id}.json`, outputDir), `${JSON.stringify(chunk, null, 2)}\n`);
}

console.log(`Wrote ${entries.length} entries across ${generations.length} generations`);

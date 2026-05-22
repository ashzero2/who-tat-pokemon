import { readFile } from 'node:fs/promises';

const dataDir = new URL('../static/data/pokemon/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('index.json', dataDir), 'utf8'));
const errors = [];
const seenIds = new Set();
let totalEntries = 0;
let totalGuessable = 0;

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(manifest.schemaVersion === 1, 'Manifest schemaVersion must be 1');
assert(Array.isArray(manifest.generations), 'Manifest generations must be an array');

for (const generation of manifest.generations ?? []) {
  const chunk = JSON.parse(await readFile(new URL(generation.chunk, dataDir), 'utf8'));
  assert(chunk.schemaVersion === manifest.schemaVersion, `${generation.chunk} schemaVersion mismatch`);
  assert(chunk.generation.id === generation.id, `${generation.chunk} generation id mismatch`);
  assert(Array.isArray(chunk.entries), `${generation.chunk} entries must be an array`);
  assert(chunk.entries.length === generation.entries, `${generation.chunk} entry count mismatch`);

  let guessableEntries = 0;

  for (const entry of chunk.entries) {
    totalEntries += 1;
    if (entry.guessable) {
      guessableEntries += 1;
      totalGuessable += 1;
    }

    assert(!seenIds.has(entry.id), `Duplicate entry id ${entry.id}`);
    seenIds.add(entry.id);
    assert(entry.speciesId >= generation.range[0] && entry.speciesId <= generation.range[1], `${entry.name} species outside generation range`);
    assert(entry.generation === generation.id, `${entry.name} generation mismatch`);
    assert(typeof entry.displayName === 'string' && entry.displayName.length > 0, `${entry.name} missing displayName`);
    assert(Array.isArray(entry.types) && entry.types.length > 0, `${entry.name} missing types`);
    assert(Array.isArray(entry.aliases) && entry.aliases.length > 0, `${entry.name} missing aliases`);
    assert(entry.artwork && typeof entry.artwork === 'object', `${entry.name} missing artwork`);

    if (entry.guessable) {
      assert(
        Boolean(entry.artwork.official || entry.artwork.home || entry.artwork.sprite || entry.artwork.fallback),
        `${entry.name} is guessable without artwork`
      );
    }
  }

  assert(guessableEntries === generation.guessableEntries, `${generation.chunk} guessable count mismatch`);
}

assert(totalEntries === manifest.totalEntries, 'Manifest totalEntries mismatch');
assert(totalGuessable === manifest.guessableEntries, 'Manifest guessableEntries mismatch');

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${totalEntries} Pokemon entries (${totalGuessable} guessable)`);

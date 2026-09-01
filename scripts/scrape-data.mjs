#!/usr/bin/env node
/**
 * Flyff Builds data scraper — refreshes the raw game data under data-src/ from the public
 * Flyff Universe API (https://api.flyff.com). Adapted from Flyffulator's scripts/scrape.mjs
 * (https://github.com/Frostiae/Flyffulator, GPL-3.0) and trimmed to the files this app reads.
 *
 * Three kinds of source:
 *   - id-list collections (class, skill, item, equipset): fetch the id list from the collection
 *     endpoint, batch-fetch the full objects, assemble a keyed { [id]: object } map;
 *   - whole-endpoint assets (statawake, skillawake, upgradebonus, pets): the entire endpoint
 *     response is the file;
 *   - housing NPCs: fetch the housing pack list and keep the NPCs that grant abilities.
 *
 * StatNames.json has no list endpoint: its id set is derived from every parameter referenced by
 * the (freshly scraped) game data and each name is fetched from /language/parameter/<id>.
 *
 * Blessings.json and Achievements.json are curated by hand (no usable endpoint) and never touched.
 * The current data version (from /version/data) is written to data-src/version.json; the build
 * pipeline copies it into the generated manifest and the app footer shows it.
 *
 * Usage:
 *   pnpm scrape-data                # scrape everything
 *   pnpm scrape-data item skill     # scrape only the named collections
 *   pnpm scrape-data -- --dry-run   # fetch + report, but don't write files
 *
 * After scraping, run `pnpm build-data` to regenerate src/data/generated.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data-src');
const API_BASE = 'https://api.flyff.com';

const COLLECTIONS = [
  { name: 'class', endpoint: 'class', file: 'Classes.json' },
  { name: 'skill', endpoint: 'skill', file: 'Skills.json' },
  { name: 'item', endpoint: 'item', file: 'Items.json' },
  { name: 'equipset', endpoint: 'equipset', file: 'EquipSets.json' },
];

const WHOLE_ENDPOINTS = [
  { name: 'statawake', endpoint: 'statawake', file: 'StatAwakes.json' },
  { name: 'skillawake', endpoint: 'skillawake', file: 'SkillAwakes.json' },
  { name: 'upgradebonus', endpoint: 'upgradelevelbonus', file: 'UpgradeBonus.json' },
  { name: 'pets', endpoint: 'raisedpet', file: 'Pets.json', transform: keyByPetItemId },
];

const BATCH_SIZE = 400;
const CONCURRENCY = 6;
const MAX_RETRIES = 4;

/** Fetch a URL as JSON with exponential-backoff retries. */
async function fetchJson(url) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

function chunk(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/** Run `worker` over `items` with a bounded number of in-flight promises; results keep input order. */
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));

  return results;
}

async function writeAsset(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
}

/** /raisedpet returns an array; the pipeline expects a { [petItemId]: pet } map. */
function keyByPetItemId(apiData) {
  const map = {};

  for (const pet of apiData) {
    map[pet.petItemId] = pet;
  }

  return map;
}

async function scrapeCollection(collection, { dryRun }) {
  const { name, endpoint, file } = collection;
  const started = Date.now();

  console.log(`\n[${name}] fetching id list from ${API_BASE}/${endpoint} ...`);
  const ids = await fetchJson(`${API_BASE}/${endpoint}`);
  const batches = chunk(ids, BATCH_SIZE);
  console.log(`[${name}] ${ids.length} ids in ${batches.length} batches ...`);

  let completed = 0;
  const batchResults = await mapWithConcurrency(batches, CONCURRENCY, async (batch) => {
    const objects = await fetchJson(`${API_BASE}/${endpoint}/${batch.join(',')}`);
    completed += 1;
    process.stdout.write(`\r[${name}] batch ${completed}/${batches.length}   `);

    return objects;
  });

  process.stdout.write('\n');

  const map = {};

  for (const objects of batchResults) {
    for (const object of objects) {
      map[object.id] = object;
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[${name}] done in ${elapsed}s -> ${Object.keys(map).length} entries`);

  if (!dryRun) {
    await writeAsset(join(DATA_DIR, file), map);
    console.log(`[${name}] wrote ${file}`);
  }
}

async function scrapeWholeEndpoint(entry, { dryRun }) {
  const { name, endpoint, file, transform } = entry;

  console.log(`\n[${name}] fetching ${API_BASE}/${endpoint} ...`);
  let data = await fetchJson(`${API_BASE}/${endpoint}`);

  if (transform) {
    data = transform(data);
  }

  const count = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`[${name}] ${count} entries`);

  if (!dryRun) {
    await writeAsset(join(DATA_DIR, file), data);
    console.log(`[${name}] wrote ${file}`);
  }
}

/**
 * Housing packs are mostly furniture; the buff-granting ones expose an `npcs` array. NPCs are keyed
 * by pack id (stable across re-scrapes) and duplicates (same English name + abilities in several
 * packs) keep the lowest pack id — matching Flyffulator's HousingNPCs.json convention.
 */
async function scrapeHousingNpcs({ dryRun }) {
  console.log(`\n[housingnpcs] fetching pack list from ${API_BASE}/housing/packs ...`);
  const packIds = await fetchJson(`${API_BASE}/housing/packs`);
  const batches = chunk(packIds, BATCH_SIZE);

  const batchResults = await mapWithConcurrency(batches, CONCURRENCY, async (batch) =>
    fetchJson(`${API_BASE}/housing/packs/${batch.join(',')}`),
  );

  const byIdentity = new Map();

  for (const packs of batchResults) {
    for (const pack of packs ?? []) {
      for (const npc of pack?.npcs ?? []) {
        if (!npc.abilities || npc.abilities.length === 0) {
          continue;
        }

        const identity = `${npc.name.en} ${JSON.stringify(npc.abilities)}`;
        const existing = byIdentity.get(identity);

        if (!existing || pack.packItemId < existing.id) {
          byIdentity.set(identity, {
            id: pack.packItemId,
            name: npc.name,
            abilities: npc.abilities,
          });
        }
      }
    }
  }

  const map = {};

  for (const npc of [...byIdentity.values()].sort((a, b) => a.id - b.id)) {
    map[npc.id] = npc;
  }

  console.log(`[housingnpcs] ${Object.keys(map).length} NPCs with abilities`);

  if (!dryRun) {
    await writeAsset(join(DATA_DIR, 'HousingNPCs.json'), map);
    console.log('[housingnpcs] wrote HousingNPCs.json');
  }
}

/** A missing parameter legitimately 404s; return null rather than retrying it. */
async function fetchParameterName(id) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}/language/parameter/${encodeURIComponent(id)}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch {
      if (attempt === MAX_RETRIES) {
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }

  return null;
}

/** Every stat parameter referenced across the data files this app reads (plus the existing names). */
async function deriveParameterIds() {
  const ids = new Set();

  const addAbilities = (abilities) => {
    for (const ability of abilities ?? []) {
      if (ability && ability.parameter) {
        ids.add(ability.parameter);
      }
    }
  };

  const readJson = async (file) => JSON.parse(await readFile(join(DATA_DIR, file), 'utf8'));

  if (existsSync(join(DATA_DIR, 'StatNames.json'))) {
    for (const id of Object.keys(await readJson('StatNames.json'))) {
      ids.add(id);
    }
  }

  for (const item of Object.values(await readJson('Items.json'))) {
    addAbilities(item.abilities);
    addAbilities(item.possibleRandomStats);

    for (const upgrade of item.upgradeLevels ?? []) {
      addAbilities(upgrade.abilities);
    }
  }

  for (const skill of Object.values(await readJson('Skills.json'))) {
    for (const levelProp of skill.levels ?? []) {
      addAbilities(levelProp.abilities);
      addAbilities(levelProp.scalingParameters);
    }
  }

  for (const set of Object.values(await readJson('EquipSets.json'))) {
    for (const bonus of set.bonus ?? []) {
      if (bonus && bonus.ability && bonus.ability.parameter) {
        ids.add(bonus.ability.parameter);
      }
    }
  }

  for (const statAwake of await readJson('StatAwakes.json')) {
    addAbilities(statAwake.abilities);
  }

  for (const bonus of await readJson('UpgradeBonus.json')) {
    addAbilities(bonus.setAbilities);
  }

  for (const npc of Object.values(await readJson('HousingNPCs.json'))) {
    addAbilities(npc.abilities);
  }

  for (const pet of Object.values(await readJson('Pets.json'))) {
    if (pet.parameter) {
      ids.add(pet.parameter);
    }
  }

  for (const category of Object.values(await readJson('SkillAwakes.json'))) {
    for (const parameter of Object.keys(category.parameters ?? {})) {
      ids.add(parameter);
    }
  }

  for (const parameter of Object.keys(await readJson('Blessings.json'))) {
    ids.add(parameter);
  }

  return [...ids].sort();
}

async function scrapeStatNames({ dryRun }) {
  console.log('\n[statnames] deriving parameter ids from the game data ...');
  const ids = await deriveParameterIds();
  console.log(`[statnames] ${ids.length} parameters; fetching /language/parameter ...`);

  let completed = 0;
  const results = await mapWithConcurrency(ids, CONCURRENCY, async (id) => {
    const entry = await fetchParameterName(id);
    completed += 1;
    process.stdout.write(`\r[statnames] ${completed}/${ids.length}   `);

    return [id, entry];
  });

  process.stdout.write('\n');

  const map = {};

  for (const [id, entry] of results) {
    if (entry !== null) {
      map[id] = entry;
    }
  }

  console.log(`[statnames] ${Object.keys(map).length} entries`);

  if (!dryRun) {
    await writeAsset(join(DATA_DIR, 'StatNames.json'), map);
    console.log('[statnames] wrote StatNames.json');
  }
}

async function scrapeVersion({ dryRun }) {
  const dataVersion = await fetchJson(`${API_BASE}/version/data`);
  console.log(`\n[version] api.flyff.com data version: ${dataVersion}`);

  if (typeof dataVersion !== 'number') {
    throw new Error(`Unexpected /version/data payload: ${JSON.stringify(dataVersion)}`);
  }

  if (!dryRun) {
    await writeAsset(join(DATA_DIR, 'version.json'), {
      dataVersion,
      scrapedAt: new Date().toISOString(),
    });
    console.log('[version] wrote version.json');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requested = args.filter((arg) => !arg.startsWith('--'));

  const allNames = [
    ...COLLECTIONS.map((c) => c.name),
    ...WHOLE_ENDPOINTS.map((w) => w.name),
    'housingnpcs',
    'statnames',
    'version',
  ];
  let selected = allNames;

  if (requested.length > 0) {
    const unknown = requested.filter((r) => !allNames.includes(r));

    if (unknown.length > 0) {
      console.error(`Unknown collection(s): ${unknown.join(', ')}`);
      console.error(`Available: ${allNames.join(', ')}`);
      process.exit(1);
    }

    selected = requested;
  }

  console.log(`Flyff Builds scraper -> ${API_BASE}`);
  console.log(`Collections: ${selected.join(', ')}${dryRun ? ' (dry-run)' : ''}`);
  console.log('Curated files (never scraped): Blessings.json, Achievements.json');

  const overallStart = Date.now();

  // Collections run sequentially so progress output stays readable; batches within a collection
  // run in parallel. StatNames runs last so it derives its id set from the freshly written data.
  for (const collection of COLLECTIONS) {
    if (selected.includes(collection.name)) {
      await scrapeCollection(collection, { dryRun });
    }
  }

  for (const entry of WHOLE_ENDPOINTS) {
    if (selected.includes(entry.name)) {
      await scrapeWholeEndpoint(entry, { dryRun });
    }
  }

  if (selected.includes('housingnpcs')) {
    await scrapeHousingNpcs({ dryRun });
  }

  if (selected.includes('statnames')) {
    await scrapeStatNames({ dryRun });
  }

  if (selected.includes('version')) {
    await scrapeVersion({ dryRun });
  }

  console.log(`\nAll done in ${((Date.now() - overallStart) / 1000).toFixed(1)}s.`);
  console.log('Next: pnpm build-data');
}

main().catch((error) => {
  console.error('\nScrape failed:', error.message);
  process.exit(1);
});

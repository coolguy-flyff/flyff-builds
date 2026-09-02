import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ACCESSORY_SET_IDS, BUNDLED_SKILL_IDS } from '../../src/data/constants';
import {
  GENERATED_TABLE_FILES,
  GeneratedDataSchema,
  type GeneratedData,
  type GeneratedTableName,
  type SlimItem,
} from '../../src/data/schema';

import { buildManifest } from './manifest';
import {
  collectAwakeSkillIds,
  collectSkillChanceSkillIds,
  projectAchievement,
  projectBlessings,
  projectClass,
  projectHousingNpc,
  projectItem,
  projectPet,
  projectSkill,
  projectSkillAwakes,
  projectStatAwake,
  projectStatNames,
  projectUpgradeBonusRow,
} from './project';
import { derivePierceTarget, resolveAccessorySet, resolveArmorSet } from './resolveSets';
import {
  getAllChainIds,
  getThirdJobIds,
  isEligibleShield,
  isEligibleWeapon,
  isPiercingCard,
  isPowerup,
  isStatCloak,
  isStatMask,
  isStatPet,
  isBundledArmorSet,
  isUltimateJewel,
} from './select';
import { loadSources, type RawSources } from './source';
import { detectDrift, formatTable, writeTables } from './write';

/**
 * build-data: turns Flyffulator's `data-src` (75 MB of game data) into the slim tables the app
 * bundles (~400 KB). Usage:
 *   pnpm build-data            regenerate src/data/generated
 *   pnpm build-data:check      fail if the committed tables differ from a fresh generation
 * The source directory comes from FLYFFULATOR_DATA_DIR (default ../Flyffulator/data-src).
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_SOURCE_DIR = resolve(REPO_ROOT, 'data-src');
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, 'src', 'data', 'generated');

/** Expected table sizes at the time of writing; drift beyond ±20 % is reported, not fatal. */
const EXPECTED_COUNTS: Readonly<Record<string, number>> = {
  items: 2167,
  classes: 21,
  armorSets: 274,
  accessorySets: 4,
  statAwakes: 48,
  awakeSkills: 143,
  upgradeBonus: 20,
  achievements: 5,
  housingNpcs: 39,
  pets: 9,
  skills: 16,
  statNames: 169,
};

interface CliOptions {
  check: boolean;
  sourceDir: string;
  outDir: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    check: false,
    sourceDir: process.env.FLYFFULATOR_DATA_DIR ?? DEFAULT_SOURCE_DIR,
    outDir: DEFAULT_OUT_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--out') {
      const value = argv[i + 1];

      if (value === undefined) {
        throw new Error('--out requires a directory');
      }

      options.outDir = resolve(value);
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg ?? ''}`);
    }
  }

  return options;
}

interface Assembled {
  data: GeneratedData;
  warnings: string[];
}

/** Relative, forward-slash form of the source dir for the manifest (no machine-local paths). */
function portableSourceDir(sourceDir: string): string {
  const relativePath = relative(REPO_ROOT, sourceDir).replaceAll('\\', '/');

  return relativePath === '' ? '.' : relativePath;
}

/** The API data version captured by `pnpm scrape-data` (data-src/version.json), if present. */
function readDataVersion(sourceDir: string): number | undefined {
  const path = join(sourceDir, 'version.json');
  let dataVersion: number | undefined;

  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { dataVersion?: unknown };

    if (typeof parsed.dataVersion === 'number') {
      dataVersion = parsed.dataVersion;
    }
  }

  return dataVersion;
}

function selectItems(sources: RawSources): { items: SlimItem[]; armorSetIds: number[] } {
  const thirdJobIds = getThirdJobIds(sources.classes);
  const chainIds = getAllChainIds(sources.classes, thirdJobIds);
  const selected = new Map<number, SlimItem>();

  const armorSetIds: number[] = [];

  for (const set of Object.values(sources.equipSets)) {
    if (isBundledArmorSet(set, sources.items, chainIds)) {
      armorSetIds.push(set.id);

      for (const partId of set.parts) {
        const part = sources.items[String(partId)];

        if (part !== undefined) {
          selected.set(part.id, projectItem(part));
        }
      }
    }
  }

  for (const setId of ACCESSORY_SET_IDS) {
    const set = sources.equipSets[String(setId)];

    if (set === undefined) {
      throw new Error(`Accessory set ${setId} is missing from EquipSets.json`);
    }

    for (const partId of set.parts) {
      const part = sources.items[String(partId)];

      if (part === undefined) {
        throw new Error(`Accessory set ${setId}: part ${partId} is missing from Items.json`);
      }

      selected.set(part.id, projectItem(part));
    }
  }

  for (const raw of Object.values(sources.items)) {
    const eligible =
      isEligibleWeapon(raw, chainIds) ||
      isEligibleShield(raw) ||
      isStatCloak(raw) ||
      isStatMask(raw) ||
      isPiercingCard(raw) ||
      isUltimateJewel(raw) ||
      isStatPet(raw, sources.pets) ||
      isPowerup(raw);

    if (!eligible || selected.has(raw.id)) {
      continue;
    }

    const item = projectItem(raw);

    if (isPiercingCard(raw)) {
      item.pierceTarget = derivePierceTarget(raw);
    }

    selected.set(item.id, item);
  }

  return {
    items: [...selected.values()].sort((a, b) => a.id - b.id),
    armorSetIds: armorSetIds.sort((a, b) => a - b),
  };
}

function assemble(
  sources: RawSources,
  sourceDir: string,
  digests: Record<string, { sha256: string; bytes: number }>,
  generatedAt: string,
): Assembled {
  const warnings: string[] = [];
  const { items, armorSetIds } = selectItems(sources);
  const itemIds = new Set(items.map((item) => item.id));

  const armorSets = armorSetIds.map((id) => {
    const set = sources.equipSets[String(id)];

    if (set === undefined) {
      throw new Error(`Armor set ${id} vanished during assembly`);
    }

    return resolveArmorSet(set, sources.items);
  });

  const accessorySets = ACCESSORY_SET_IDS.map((id) => {
    const set = sources.equipSets[String(id)];

    if (set === undefined) {
      throw new Error(`Accessory set ${id} is missing from EquipSets.json`);
    }

    return resolveAccessorySet(set, sources.items);
  });

  const skills = BUNDLED_SKILL_IDS.map((id) => {
    const skill = sources.skills[String(id)];

    if (skill === undefined) {
      throw new Error(`Skill ${id} is missing from Skills.json`);
    }

    return projectSkill(skill);
  });

  // Skills the app only needs by name: skill-damage awakes and skill-chance item abilities.
  const namedSkillIds = [
    ...new Set([
      ...collectAwakeSkillIds(sources.skillAwakes),
      ...collectSkillChanceSkillIds(sources.items),
    ]),
  ].sort((a, b) => a - b);
  const awakeSkills = namedSkillIds.map((id) => {
    const skill = sources.skills[String(id)];

    if (skill === undefined) {
      throw new Error(`Named skill ${id} is missing from Skills.json`);
    }

    return { id, name: skill.name.en, icon: skill.icon };
  });

  const pets = [];

  for (const raw of Object.values(sources.pets)) {
    const item = sources.items[String(raw.petItemId)];

    if (item === undefined) {
      continue;
    }

    const def = projectPet(raw, item.name.en);

    if (def !== undefined) {
      pets.push(def);
    }
  }

  for (const set of armorSets) {
    for (const partId of Object.values(set.parts)) {
      if (!itemIds.has(partId)) {
        throw new Error(`Armor set ${set.id}: part ${partId} is not in the item bundle`);
      }
    }
  }

  const tables = {
    items,
    classes: Object.values(sources.classes)
      .map(projectClass)
      .sort((a, b) => a.id - b.id),
    armorSets,
    accessorySets,
    statAwakes: sources.statAwakes.map(projectStatAwake),
    skillAwakes: projectSkillAwakes(sources.skillAwakes),
    awakeSkills,
    upgradeBonus: sources.upgradeBonus.map(projectUpgradeBonusRow),
    blessings: projectBlessings(sources.blessings),
    achievements: sources.achievements.map(projectAchievement),
    housingNpcs: Object.values(sources.housingNpcs)
      .map(projectHousingNpc)
      .sort((a, b) => a.id - b.id),
    pets: pets.sort((a, b) => a.petItemId - b.petItemId),
    skills,
    statNames: projectStatNames(sources.statNames),
  };

  const counts: Record<string, number> = {};

  for (const [name, table] of Object.entries(tables)) {
    counts[name] = Array.isArray(table) ? table.length : Object.keys(table).length;
    const expected = EXPECTED_COUNTS[name];

    if (expected !== undefined && Math.abs(counts[name] - expected) > expected * 0.2) {
      warnings.push(`${name}: ${counts[name]} entries, expected about ${expected}`);
    }
  }

  const dataVersion = readDataVersion(sourceDir);

  if (dataVersion === undefined) {
    warnings.push(
      'data-src/version.json missing or invalid — the footer will show no data version',
    );
  }

  const manifest = buildManifest({
    sourceDir: portableSourceDir(sourceDir),
    dataVersion,
    digests,
    counts,
    generatedAt,
  });

  const data = GeneratedDataSchema.parse({ ...tables, manifest });

  return { data, warnings };
}

function formatAll(data: GeneratedData): Record<string, string> {
  const files: Record<string, string> = {};

  for (const [table, file] of Object.entries(GENERATED_TABLE_FILES) as [
    GeneratedTableName,
    string,
  ][]) {
    files[file] = formatTable(data[table]);
  }

  return files;
}

/**
 * In `--check` mode the manifest's `generatedAt` would always differ, so the committed timestamp is
 * reused; every other byte must match.
 */
function readCommittedGeneratedAt(outDir: string): string | undefined {
  const path = join(outDir, GENERATED_TABLE_FILES.manifest);
  let generatedAt: string | undefined;

  if (existsSync(path)) {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { generatedAt?: unknown };

    if (typeof parsed.generatedAt === 'string') {
      generatedAt = parsed.generatedAt;
    }
  }

  return generatedAt;
}

function main(): number {
  const options = parseArgs(process.argv.slice(2));
  const started = Date.now();

  console.log(`build-data: reading ${options.sourceDir}`);
  const { sources, digests } = loadSources(options.sourceDir);

  const generatedAt =
    (options.check ? readCommittedGeneratedAt(options.outDir) : undefined) ??
    new Date().toISOString();
  const { data, warnings } = assemble(sources, options.sourceDir, digests, generatedAt);
  const files = formatAll(data);

  for (const warning of warnings) {
    console.warn(`build-data: warning: ${warning}`);
  }

  let exitCode = 0;

  if (options.check) {
    const drift = detectDrift(options.outDir, files);

    if (drift.changed.length > 0 || drift.missing.length > 0) {
      console.error(
        `build-data: committed tables are stale (changed: ${drift.changed.join(', ') || 'none'}; missing: ${drift.missing.join(', ') || 'none'}). Run pnpm build-data.`,
      );
      exitCode = 1;
    } else {
      console.log('build-data: committed tables are up to date');
    }
  } else {
    writeTables(options.outDir, files);
    console.log(`build-data: wrote ${Object.keys(files).length} tables to ${options.outDir}`);
  }

  const summary = Object.entries(data.manifest.counts)
    .map(([table, count]) => `${table}=${count}`)
    .join(' ');
  console.log(`build-data: ${summary} (${((Date.now() - started) / 1000).toFixed(1)}s)`);

  return exitCode;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`build-data: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

import { BUILD_SCHEMA_VERSION } from './schema';

/**
 * Persisted builds carry `schemaVersion`. When the schema changes, add a migration keyed by the
 * version it upgrades FROM; `migrateToCurrent` applies them in order. Migrations operate on
 * `unknown` input and must never throw on malformed data — zod validation follows and reports it.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 1 → 2: accessory sets gain per-piece sources (none: every piece follows the entry's set), buffs
 * gain the active class skills
 * (none — a stored build keeps computing exactly what it did before; fresh builds start with the
 * job's permanent passives on).
 */
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const next = { ...raw };

  if (Array.isArray(raw.accessorySets)) {
    next.accessorySets = raw.accessorySets.map((entry: unknown) =>
      isRecord(entry) && entry.pieceSources === undefined
        ? {
            ...entry,
            pieceSources: {
              ring1: null,
              ring2: null,
              earring1: null,
              earring2: null,
              necklace: null,
            },
          }
        : entry,
    );
  }

  if (isRecord(raw.buffs) && raw.buffs.classSkillIds === undefined) {
    next.buffs = { ...raw.buffs, classSkillIds: [] };
  }

  return next;
}

/** 2 → 3: the build gains its custom PvP targets (none — the presets were all there was). */
function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  return raw.pvpTargets === undefined ? { ...raw, pvpTargets: [] } : raw;
}

/** 3 → 4: buffs gain the active couple skills (none — they did not exist before). */
function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
  let next = raw;

  if (isRecord(raw.buffs) && raw.buffs.coupleSkillIds === undefined) {
    next = { ...raw, buffs: { ...raw.buffs, coupleSkillIds: [] } };
  }

  return next;
}

const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
};

export function readSchemaVersion(raw: unknown): number | undefined {
  let version: number | undefined;

  if (isRecord(raw) && typeof raw.schemaVersion === 'number') {
    version = raw.schemaVersion;
  }

  return version;
}

export function migrateToCurrent(raw: unknown): unknown {
  let current: unknown = raw;
  let version = readSchemaVersion(raw);

  while (version !== undefined && version < BUILD_SCHEMA_VERSION && isRecord(current)) {
    const migration = MIGRATIONS[version];

    if (migration === undefined) {
      break;
    }

    current = { ...migration(current), schemaVersion: version + 1 };
    version += 1;
  }

  return current;
}

import { BUILD_SCHEMA_VERSION } from './schema';

/**
 * Persisted builds carry `schemaVersion`. When the schema changes, add a migration keyed by the
 * version it upgrades FROM; `migrateToCurrent` applies them in order. Migrations operate on
 * `unknown` input and must never throw on malformed data — zod validation follows and reports it.
 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Readonly<Record<number, Migration>> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

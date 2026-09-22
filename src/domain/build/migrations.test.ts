import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { createAccessorySetEntry, createDefaultBuild } from './defaults';
import { migrateToCurrent } from './migrations';
import { BUILD_SCHEMA_VERSION } from './schema';
import { validateBuild } from './validate';

const data = loadBundledGameData();
const ADEPTS_SET = 12670;

/** The default build's buffs as a schema-3 build stored them: no `coupleSkillIds`. */
function v3Buffs(): Record<string, unknown> {
  const buffs: Record<string, unknown> = { ...createDefaultBuild(data).buffs };

  delete buffs.coupleSkillIds;

  return buffs;
}

/** A schema-1 build as persisted before 2026-09-03: no `pieceSources`, no `classSkillIds`. */
function v1Build(): Record<string, unknown> {
  const current: Record<string, unknown> = { ...createDefaultBuild(data) };
  const accessorySet: Record<string, unknown> = { ...createAccessorySetEntry(3, ADEPTS_SET) };
  const buffs = v3Buffs();

  delete current.pvpTargets;
  delete accessorySet.pieceSources;
  delete buffs.classSkillIds;

  return {
    ...current,
    schemaVersion: 1,
    nextId: 4,
    accessorySets: [accessorySet],
    buffs,
  };
}

/** A schema-2 build as persisted before 2026-09-05: no custom PvP targets. */
function v2Build(): Record<string, unknown> {
  const current: Record<string, unknown> = {
    ...createDefaultBuild(data),
    schemaVersion: 2,
    buffs: v3Buffs(),
  };

  delete current.pvpTargets;

  return current;
}

/** A schema-3 build as persisted before 2026-09-22: no couple skills. */
function v3Build(): Record<string, unknown> {
  return { ...createDefaultBuild(data), schemaVersion: 3, buffs: v3Buffs() };
}

describe('migrateToCurrent', () => {
  it('upgrades a schema-1 build to the current schema without changing what it computes', () => {
    const migrated = migrateToCurrent(v1Build());
    const validated = validateBuild(data, migrated);

    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    expect(validated.value.warnings).toEqual([]);
    expect(validated.value.build.schemaVersion).toBe(BUILD_SCHEMA_VERSION);
    expect(validated.value.build.buffs.classSkillIds).toEqual([]);
    expect(validated.value.build.accessorySets[0]?.pieceSources).toEqual({
      ring1: null,
      ring2: null,
      earring1: null,
      earring2: null,
      necklace: null,
    });
    expect(validated.value.build.pvpTargets).toEqual([]);
  });

  it('upgrades a schema-2 build with an empty list of custom PvP targets', () => {
    const validated = validateBuild(data, migrateToCurrent(v2Build()));

    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    expect(validated.value.warnings).toEqual([]);
    expect(validated.value.build.schemaVersion).toBe(BUILD_SCHEMA_VERSION);
    expect(validated.value.build.pvpTargets).toEqual([]);
    expect(validated.value.build.buffs.coupleSkillIds).toEqual([]);
  });

  it('upgrades a schema-3 build with no couple skills', () => {
    const validated = validateBuild(data, migrateToCurrent(v3Build()));

    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    expect(validated.value.warnings).toEqual([]);
    expect(validated.value.build.schemaVersion).toBe(BUILD_SCHEMA_VERSION);
    expect(validated.value.build.buffs.coupleSkillIds).toEqual([]);
  });

  it('leaves a current build untouched', () => {
    const build = createDefaultBuild(data);

    expect(migrateToCurrent(build)).toBe(build);
  });

  it('tolerates malformed input and leaves it to validation', () => {
    expect(migrateToCurrent({ schemaVersion: 1, buffs: 'nope', accessorySets: 3 })).toEqual({
      schemaVersion: 4,
      buffs: 'nope',
      accessorySets: 3,
      pvpTargets: [],
    });
    expect(migrateToCurrent(null)).toBeNull();
  });
});

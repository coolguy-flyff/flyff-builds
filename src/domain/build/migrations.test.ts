import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { createAccessorySetEntry, createDefaultBuild } from './defaults';
import { migrateToCurrent } from './migrations';
import { BUILD_SCHEMA_VERSION } from './schema';
import { validateBuild } from './validate';

const data = loadBundledGameData();
const ADEPTS_SET = 12670;

/** A schema-1 build as persisted before 2026-09-03: no `pieceSources`, no `classSkillIds`. */
function v1Build(): Record<string, unknown> {
  const current = createDefaultBuild(data);
  const accessorySet: Record<string, unknown> = { ...createAccessorySetEntry(3, ADEPTS_SET) };
  const buffs: Record<string, unknown> = { ...current.buffs };

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
  });

  it('leaves a current build untouched', () => {
    const build = createDefaultBuild(data);

    expect(migrateToCurrent(build)).toBe(build);
  });

  it('tolerates malformed input and leaves it to validation', () => {
    expect(migrateToCurrent({ schemaVersion: 1, buffs: 'nope', accessorySets: 3 })).toEqual({
      schemaVersion: 2,
      buffs: 'nope',
      accessorySets: 3,
    });
    expect(migrateToCurrent(null)).toBeNull();
  });
});

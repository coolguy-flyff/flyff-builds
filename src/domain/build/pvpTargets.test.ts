import { describe, expect, it } from 'vitest';

import { PVP_TARGET_PRESETS } from '@/config/pvpTargets';
import { loadBundledGameData } from '@/data';
import { requireDefined } from '@/lib/assert';

import { createDefaultBuild, createPvpTarget } from './defaults';
import type { BuildState } from './schema';
import { DEFAULT_PVP_TARGET_NAME, validateBuild } from './validate';

const data = loadBundledGameData();

function validated(build: BuildState) {
  const result = validateBuild(data, build);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.value;
}

describe('custom PvP targets', () => {
  it('copies only the six numbers of a preset into a target', () => {
    const tank = requireDefined(
      PVP_TARGET_PRESETS.find((preset) => preset.id === 'tank'),
      'tank',
    );
    const target = createPvpTarget(7, 'My tank', tank);

    expect(target).toEqual({
      id: 7,
      name: 'My tank',
      defense: tank.defense,
      magicDefense: tank.magicDefense,
      magicResistance: tank.magicResistance,
      criticalResist: tank.criticalResist,
      pvpDamageReduction: tank.pvpDamageReduction,
      incomingDamage: tank.incomingDamage,
    });
  });

  it('accepts a target with numbers inside the bounds without warnings', () => {
    const build = createDefaultBuild(data);
    const target = createPvpTarget(build.nextId, 'Guild tank', {
      defense: 21500,
      magicDefense: 9800,
      magicResistance: 42.5,
      criticalResist: 38,
      pvpDamageReduction: 25,
      incomingDamage: -12,
    });
    const result = validated({ ...build, nextId: build.nextId + 1, pvpTargets: [target] });

    expect(result.warnings).toEqual([]);
    expect(result.build.pvpTargets).toEqual([target]);
  });

  it('clamps numbers to the game caps, rounds percentages and names an unnamed target', () => {
    const build = createDefaultBuild(data);
    const result = validated({
      ...build,
      pvpTargets: [
        {
          id: 40,
          name: '   ',
          defense: 8000,
          magicDefense: 4000,
          magicResistance: 120,
          criticalResist: 12.34,
          pvpDamageReduction: 60,
          incomingDamage: -80,
        },
      ],
    });
    const [target] = result.build.pvpTargets;

    expect(target).toMatchObject({
      name: DEFAULT_PVP_TARGET_NAME,
      magicResistance: 100,
      criticalResist: 12.3,
      pvpDamageReduction: 50,
      incomingDamage: -50,
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'target-renamed',
      'target-clamped',
      'target-clamped',
      'target-clamped',
      'target-clamped',
    ]);
    // A target id above `nextId` bumps it like any other entry.
    expect(result.build.nextId).toBe(41);
  });

  it('rejects more targets than the limit or a non-integer defense structurally', () => {
    const build = createDefaultBuild(data);
    const target = createPvpTarget(3, 'x', requireDefined(PVP_TARGET_PRESETS[0], 'preset'));

    expect(
      validateBuild(data, { ...build, pvpTargets: Array<typeof target>(9).fill(target) }).ok,
    ).toBe(false);
    expect(validateBuild(data, { ...build, pvpTargets: [{ ...target, defense: 1.5 }] }).ok).toBe(
      false,
    );
  });
});

import { describe, expect, it } from 'vitest';

import { requireDefined } from '@/lib/assert';

import {
  PVP_TARGET_BOUNDS,
  PVP_TARGET_PRESETS,
  PVP_TARGET_STAT_KEYS,
  pvpTargetStatsOf,
} from './pvpTargets';

describe('PVP_TARGET_PRESETS', () => {
  it('lists the three role presets with distinct names', () => {
    expect(PVP_TARGET_PRESETS.map((preset) => preset.id)).toEqual(['squishy', 'balanced', 'tank']);
    expect(new Set(PVP_TARGET_PRESETS.map((preset) => preset.name)).size).toBe(
      PVP_TARGET_PRESETS.length,
    );
  });

  it('keeps every number inside the bounds a custom target may hold', () => {
    for (const preset of PVP_TARGET_PRESETS) {
      for (const key of PVP_TARGET_STAT_KEYS) {
        const bounds = PVP_TARGET_BOUNDS[key];

        expect(preset[key], `${preset.name} ${key}`).toBeGreaterThanOrEqual(bounds.min);
        expect(preset[key], `${preset.name} ${key}`).toBeLessThanOrEqual(bounds.max);
      }
    }
  });

  it('starts with a raw reference: defense only, no resistance of any kind', () => {
    expect(PVP_TARGET_PRESETS[0]).toMatchObject({
      magicResistance: 0,
      criticalResist: 0,
      pvpDamageReduction: 0,
      incomingDamage: 0,
    });
  });
});

describe('pvpTargetStatsOf', () => {
  it('copies the six numbers and drops everything else', () => {
    const preset = requireDefined(PVP_TARGET_PRESETS[0], 'preset');
    const stats = pvpTargetStatsOf(preset);

    expect(Object.keys(stats).sort()).toEqual([...PVP_TARGET_STAT_KEYS].sort());
    expect(stats.defense).toBe(preset.defense);
  });
});

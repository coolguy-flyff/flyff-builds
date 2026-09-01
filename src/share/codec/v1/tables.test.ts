import { describe, expect, it } from 'vitest';

import {
  EARRING_VARIANTS,
  loadBundledGameData,
  NECKLACE_VARIANTS,
  STAT_KEYS,
  type GameData,
} from '@/data';
import { LIMITS, MIN_BASE_STAT } from '@/domain/build/schema';
import { STAT_STEPS } from '@/domain/rules';

import { MAX_STRING_LENGTH } from '../../bytes';

import {
  BASE_STAT_OFFSET_V1,
  EARRING_VARIANTS_V1,
  NECKLACE_VARIANTS_V1,
  PARAM_ESCAPE,
  PARAM_TABLE_V1,
  STAT_KEYS_V1,
  STEP_V1,
} from './tables';

/** The table as released; a change here means a link in the wild no longer decodes the same way. */
const RELEASED_PARAM_TABLE_V1 = [
  'actionspeed',
  'allelementsmastery',
  'attack',
  'attackspeed',
  'bleedandpoisonresist',
  'block',
  'blockpenetration',
  'criticalchance',
  'criticaldamage',
  'criticalresist',
  'decreasedcastingtime',
  'def',
  'dex',
  'earthdefense',
  'electricitydefense',
  'firedefense',
  'healing',
  'int',
  'magicdefense',
  'maxfp',
  'maxhp',
  'maxmp',
  'meleeblock',
  'parry',
  'pvedamage',
  'pveincomingdamage',
  'pvpdamage',
  'rangedblock',
  'reflectdamage',
  'speed',
  'sta',
  'stealhp',
  'str',
  'waterdefense',
  'winddefense',
];

/** Every parameter the codec may need to write through the table today. */
function bundledParameters(data: GameData): Set<string> {
  const parameters = new Set<string>();

  for (const item of data.items.values()) {
    for (const ability of item.possibleRandomStats ?? []) {
      parameters.add(ability.parameter);
    }
  }

  for (const parameter of Object.keys(data.blessings)) {
    parameters.add(parameter);
  }

  for (const category of Object.values(data.skillAwakes)) {
    for (const parameter of Object.keys(category)) {
      // `skill:<id>` damage awakes travel through the escape by design (open-ended id space).
      if (!parameter.startsWith('skill:')) {
        parameters.add(parameter);
      }
    }
  }

  return parameters;
}

describe('PARAM_TABLE_V1', () => {
  it('keeps the released entries at their released positions', () => {
    expect(PARAM_TABLE_V1.slice(0, RELEASED_PARAM_TABLE_V1.length)).toEqual(
      RELEASED_PARAM_TABLE_V1,
    );
  });

  it('contains every parameter of the current data bundle (append new ones, never insert)', () => {
    const data = loadBundledGameData();
    const missing = [...bundledParameters(data)].filter(
      (parameter) => !PARAM_TABLE_V1.includes(parameter),
    );

    expect(missing).toEqual([]);
  });

  it('is frozen, free of duplicates and leaves room for the escape codes', () => {
    expect(Object.isFrozen(PARAM_TABLE_V1)).toBe(true);
    expect(new Set(PARAM_TABLE_V1).size).toBe(PARAM_TABLE_V1.length);
    expect(PARAM_TABLE_V1.length).toBeLessThan(PARAM_ESCAPE);
  });
});

describe('frozen copies of domain constants', () => {
  it('still match the domain (a divergence needs a new codec version)', () => {
    expect(STEP_V1).toEqual(STAT_STEPS);
    expect([...STAT_KEYS_V1]).toEqual([...STAT_KEYS]);
    expect([...EARRING_VARIANTS_V1]).toEqual([...EARRING_VARIANTS]);
    expect([...NECKLACE_VARIANTS_V1]).toEqual([...NECKLACE_VARIANTS]);
    expect(BASE_STAT_OFFSET_V1).toBe(MIN_BASE_STAT);
    expect(MAX_STRING_LENGTH).toBe(LIMITS.nameLength);
  });
});

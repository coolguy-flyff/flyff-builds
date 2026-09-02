import { describe, expect, it } from 'vitest';

import { CLASS_IDS, loadBundledGameData } from '@/data';

import {
  createAccessorySetEntry,
  createDefaultBuild,
  createEquipmentSetEntry,
  createFashionSetEntry,
  createGearSwap,
  createPetEntry,
  createWeaponEntry,
} from './defaults';
import { withWeaponItem, withWeaponUpgrade } from './derive';
import { collectIssues } from './issues';
import {
  autoAccessorySetName,
  autoEquipmentSetName,
  autoFashionSetName,
  autoGearSwapName,
  autoPetName,
  autoWeaponName,
  cardShortName,
  jewelShortName,
} from './naming';
import type { BuildState, EquipmentSetEntry, WeaponEntry } from './schema';
import { requireDefined } from '@/lib/assert';
import { repairBuild, validateBuild } from './validate';

const data = loadBundledGameData();
const ORACLE = 54987;
const ETRANAR_SET = 41091;
const VOLCANO_7 = 2416;
const LAND_A = 5666;
const AMETHYST_10 = 8177;
const ADEPTS_SET = 12670;
const ANGEL_PET = 1644;

function buildWith(mutate: (build: BuildState) => BuildState): BuildState {
  return mutate(createDefaultBuild(data));
}

describe('validateBuild', () => {
  it('rejects malformed input with a structure error', () => {
    const result = validateBuild(data, { schemaVersion: 1 });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe('structure');
    }
  });

  it('accepts the default build without warnings', () => {
    const result = validateBuild(data, createDefaultBuild(data));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.warnings).toEqual([]);
      expect(result.value.build).toEqual(createDefaultBuild(data));
    }
  });

  it('drops unknown items and sets, clears invalid awakes and trims stacks', () => {
    const build = buildWith((base) => ({
      ...base,
      nextId: 10,
      equipmentSets: [
        {
          ...createEquipmentSetEntry(5, 999999),
          // STR 16 needs a +4 single on every piece, leaving no room for a DEX partner.
          statAwake: [
            { stat: 'str', value: 16 },
            { stat: 'dex', value: 4 },
          ],
        },
        {
          ...createEquipmentSetEntry(6, ETRANAR_SET),
          suitCards: [
            { itemId: VOLCANO_7, count: 3 },
            { itemId: LAND_A, count: 1 },
            { itemId: VOLCANO_7, count: 4 },
          ],
        },
      ],
      weapons: [{ ...createWeaponEntry(7), itemId: 123456789 }],
    }));

    const { build: repaired, warnings } = repairBuild(data, build);

    expect(repaired.equipmentSets[0]?.setId).toBeNull();
    expect(repaired.equipmentSets[0]?.statAwake).toEqual([null, null]);
    expect(repaired.equipmentSets[1]?.suitCards).toEqual([
      { itemId: VOLCANO_7, count: 3 },
      { itemId: VOLCANO_7, count: 1 },
    ]);
    expect(repaired.weapons[0]?.itemId).toBeNull();
    expect(warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(['unknown-set', 'awake-cleared', 'unknown-item', 'stack-trimmed']),
    );
  });

  it('repairs dangling swap references and bumps nextId', () => {
    const build = buildWith((base) => ({
      ...base,
      nextId: 1,
      gearSwaps: [
        {
          ...createGearSwap(2, 1),
          equipmentSetId: 77,
          weaponId: 78,
          offhand: { kind: 'shield', id: 79 },
        },
      ],
    }));

    const { build: repaired, warnings } = repairBuild(data, build);

    expect(repaired.gearSwaps[0]?.equipmentSetId).toBeNull();
    expect(repaired.gearSwaps[0]?.weaponId).toBeNull();
    expect(repaired.gearSwaps[0]?.offhand).toBeNull();
    expect(repaired.nextId).toBe(3);
    expect(warnings.filter((warning) => warning.code === 'dangling-reference').length).toBe(3);
  });

  it('never mutates stat pages but flags over-allocation as an issue', () => {
    const build = buildWith((base) => ({
      ...base,
      statPages: [{ id: 1, str: 15, sta: 500, dex: 15, int: 15 }],
    }));

    const { build: repaired, warnings } = repairBuild(data, build);
    const issues = collectIssues(data, repaired);

    expect(repaired.statPages[0]?.sta).toBe(500);
    expect(warnings).toEqual([]);
    expect(issues.map((issue) => issue.code)).toEqual([
      'stat-page-over-allocated',
      'swap-stat-page-invalid',
    ]);
  });
});

describe('derive', () => {
  it('derives ranges and random stats for an ultimate weapon and unlocks lines with the upgrade', () => {
    const entry = withWeaponItem(data, createWeaponEntry(3), ORACLE);

    expect(entry.statRanges.length).toBeGreaterThan(0);
    expect(entry.randomStats.length).toBe(2);

    const upgraded = withWeaponUpgrade(data, entry, 10);

    expect(upgraded.randomStats.length).toBe(4);
    expect(new Set(upgraded.randomStats.map((line) => line?.parameter)).size).toBe(4);
    // Lowering the upgrade clears the lines it locks (feedback 2026-09-01, batch 2).
    expect(withWeaponUpgrade(data, upgraded, 5).randomStats.length).toBe(2);
  });
});

describe('naming', () => {
  it('formats entry and swap names as in the design', () => {
    const equipment: EquipmentSetEntry = {
      ...createEquipmentSetEntry(5, ETRANAR_SET),
      upgrade: 10,
      statAwake: [{ stat: 'sta', value: 16 }, null],
      suitCards: [{ itemId: VOLCANO_7, count: 4 }],
    };
    const weapon: WeaponEntry = {
      ...withWeaponItem(data, createWeaponEntry(6), ORACLE),
      upgrade: 10,
      statAwake: [{ stat: 'sta', value: 4 }, null],
      skillAwake: { parameter: 'healing', value: 25 },
      jewels: [{ itemId: AMETHYST_10, count: 5 }],
      cards: [{ itemId: LAND_A, count: 10 }],
    };
    const build = buildWith((base) => ({
      ...base,
      equipmentSets: [equipment],
      weapons: [weapon],
      gearSwaps: [{ ...createGearSwap(2, 1), equipmentSetId: 5, weaponId: 6 }],
    }));

    expect(autoEquipmentSetName(data, equipment)).toBe('HP/STA Etranar +10');
    // Dominant stat: STA 4 (awake) + 50 (5 × Amethyst 10) + 60 (10 × Land A) = 114.
    expect(autoWeaponName(data, weapon)).toBe('STA Healing Oracle +10');
    // Nothing configured and +0: just the item.
    expect(autoWeaponName(data, withWeaponItem(data, createWeaponEntry(8), ORACLE))).toBe('Oracle');
    expect(autoGearSwapName(data, build, requireDefined(build.gearSwaps[0], 'swap'))).toBe(
      'Etranar / Oracle / Page 1',
    );
    expect(cardShortName('Volcano Card (7%)')).toBe('Volcano 7%');
    expect(jewelShortName('Shining Amethyst (10)')).toBe('Amethyst 10');
    expect(CLASS_IDS.seraph).toBe(26141);
  });

  it('names an unupgraded accessory set "Clean" and a fully raised pet "Perfect"', () => {
    const accessory = createAccessorySetEntry(7, ADEPTS_SET);

    expect(autoAccessorySetName(data, accessory)).toBe("Clean Adept's");

    const upgraded = { ...accessory, upgrades: { ...accessory.upgrades, ring1: 10 } };

    expect(autoAccessorySetName(data, upgraded)).toBe("Adept's X0000");

    // The crit-chance pet maxes at 31 (1+2+3+4+5+7+9 across tiers F..S).
    const angel = createPetEntry(8, ANGEL_PET, 31);

    expect(autoPetName(data, angel)).toBe('Perfect Angel');
    expect(autoPetName(data, { ...angel, total: 27 })).toBe('Crit +27% pet');
  });

  it('leads fashion names with a single blessing and names swaps with every picked slot', () => {
    const fashion = { ...createFashionSetEntry(9), blessings: [{ parameter: 'sta', total: 40 }] };

    expect(autoFashionSetName(data, fashion)).toBe('STA Fashion');
    expect(autoFashionSetName(data, createFashionSetEntry(9))).toBe('Clean Fashion');
    // Two dominant blessings, ordered by the slots they need (STA 40 needs 8, crit 2.5 needs 1).
    expect(
      autoFashionSetName(data, {
        ...fashion,
        blessings: [
          { parameter: 'criticalchance', total: 2.5 },
          { parameter: 'sta', total: 40 },
        ],
      }),
    ).toBe('STA/Crit Fashion');

    const build = buildWith((base) => ({
      ...base,
      equipmentSets: [createEquipmentSetEntry(5, ETRANAR_SET)],
      weapons: [withWeaponItem(data, createWeaponEntry(6), ORACLE)],
      accessorySets: [createAccessorySetEntry(7, ADEPTS_SET)],
      fashionSets: [fashion],
      pets: [createPetEntry(8, ANGEL_PET, 31)],
      gearSwaps: [
        {
          ...createGearSwap(2, 1),
          equipmentSetId: 5,
          weaponId: 6,
          accessorySetId: 7,
          fashionSetId: 9,
          petId: 8,
        },
      ],
    }));

    expect(autoGearSwapName(data, build, requireDefined(build.gearSwaps[0], 'swap'))).toBe(
      "Etranar / Oracle / Adept's / STA Fashion / Page 1 / Angel",
    );
  });
});

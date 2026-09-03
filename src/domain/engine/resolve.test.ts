import { describe, expect, it } from 'vitest';

import { CLASS_IDS, UPCUT_STONE_ITEM_ID, loadBundledGameData, requireSkill } from '@/data';

import { getBaseStat, getStatTotal } from './abilities/totals';
import { maxedSkillContributions } from './buffs';
import { DEFAULT_WEAPON } from './defaultWeapon';
import { ENGINE_ISSUE_CODES } from './issues';
import { resolveGearSwap } from './resolve';
import {
  addAccessorySet,
  addEquipmentSet,
  addFashionSet,
  addPet,
  addShield,
  addWeapon,
  createTestBuild,
  firstSwap,
} from './testing/builders';

const data = loadBundledGameData();

const ORACLE_ULTIMATE = 54987; // 2H stick
const MAW_OF_JUDGEMENT_ULTIMATE = 11979; // 1H knuckle
const HELLS_GATE = 56920; // shield
const ETRANAR_SET = 41091;
const ADEPTS_SET = 12670;
const LAND_CARD_A = 5666; // STA +6
const VOLCANO_CARD_7 = 2416; // HP +7 %
const AMETHYST_10 = 8177; // STA +10
const CLOAK_OF_CORAL = 19985; // HP +200, speed +5 %
const HEALING_ANKOU_MASK = 47992; // healing +1 %
const LION_PET = 9941;
const K_FANG_ULTIMATE = 23879; // Slayer 1H sword
const SWORD_OF_WHISPER_ULTIMATE = 41690; // Slayer 1H sword
const CHAMPIONS_BOUNTY_FLASK = 10918;

function codes(issues: readonly { code: string }[]): string[] {
  return issues.map((issue) => issue.code);
}

describe('entry references', () => {
  it('reports dangling references and keeps computing', () => {
    const build = createTestBuild(data);
    const swap = firstSwap(build);

    swap.weaponId = 999;
    swap.equipmentSetId = 998;
    swap.statPageId = 997;

    const resolved = resolveGearSwap(data, build, swap);

    expect(resolved.mainhand).toBe(DEFAULT_WEAPON);
    expect(resolved.statPage.id).toBe(1);
    expect(codes(resolved.issues)).toEqual([
      ENGINE_ISSUE_CODES.missingEntry,
      ENGINE_ISSUE_CODES.missingEntry,
      ENGINE_ISSUE_CODES.missingEntry,
    ]);
    expect(resolved.issues.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('reports unknown item ids as warnings and treats the slot as empty', () => {
    const build = createTestBuild(data);

    addWeapon(build, { itemId: 123456789, upgrade: 10 });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.mainhand).toBe(DEFAULT_WEAPON);
    expect(resolved.mainhandUpgrade).toBe(0);
    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.unknownItem]);
  });

  it('memoises per-entry contributions on the entry object', () => {
    const build = createTestBuild(data);

    addWeapon(build, { itemId: ORACLE_ULTIMATE, upgrade: 10 });

    const first = resolveGearSwap(data, build, firstSwap(build));
    const second = resolveGearSwap(data, build, firstSwap(build));

    expect(second.contributions[0]).toBe(first.contributions[0]);
  });
});

describe('weapons', () => {
  it('uses chosen stat ranges, defaults to midpoints and adds awakes, cards and jewels', () => {
    const build = createTestBuild(data);

    addWeapon(build, {
      itemId: ORACLE_ULTIMATE,
      upgrade: 10,
      statRanges: [22, 22],
      statAwake: [
        { stat: 'sta', value: 3 },
        { stat: 'int', value: 2 },
      ],
      skillAwake: { parameter: 'healing', value: 25 },
      cards: [{ itemId: LAND_CARD_A, count: 10 }],
      jewels: [{ itemId: AMETHYST_10, count: 10 }],
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.issues).toEqual([]);
    expect(resolved.mainhandUpgrade).toBe(10);
    expect(getStatTotal(resolved, 'attack', true)).toBe(22);
    expect(getStatTotal(resolved, 'healing', true)).toBe(22 + 25);
    expect(getStatTotal(resolved, 'decreasedcastingtime', true)).toBe(37);
    expect(getStatTotal(resolved, 'int', false)).toBe(34 + 2);
    expect(getStatTotal(resolved, 'sta', false)).toBe(3 + 60 + 100);
    expect(getBaseStat(resolved, 'sta')).toBe(15 + 163);
  });

  it('caps jewels at the available slots and locks random-stat lines by upgrade', () => {
    const build = createTestBuild(data);

    addWeapon(build, {
      itemId: MAW_OF_JUDGEMENT_ULTIMATE,
      upgrade: 8,
      jewels: [{ itemId: AMETHYST_10, count: 9 }],
      randomStats: [
        { parameter: 'attack', value: 9 },
        { parameter: 'sta', value: 12 },
        { parameter: 'maxhp', value: 4 },
        { parameter: 'int', value: 6 },
      ],
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.jewelsExceedSlots]);
    expect(getStatTotal(resolved, 'sta', false)).toBe(80 + 12);
    expect(getStatTotal(resolved, 'attack', true)).toBe(9);
    expect(getStatTotal(resolved, 'maxhp', true)).toBe(4);
    expect(getStatTotal(resolved, 'int', false)).toBe(0);
  });

  it('ignores random-stat lines the weapon cannot roll', () => {
    const build = createTestBuild(data);

    addWeapon(build, {
      itemId: MAW_OF_JUDGEMENT_ULTIMATE,
      upgrade: 10,
      randomStats: [{ parameter: 'healing', value: 12 }, null],
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.randomStatInvalid]);
    expect(getStatTotal(resolved, 'healing', true)).toBe(0);
  });
});

describe('offhand rule', () => {
  it('drops the shield behind a two-handed weapon', () => {
    const build = createTestBuild(data);

    addWeapon(build, { itemId: ORACLE_ULTIMATE });
    addShield(build, { itemId: HELLS_GATE, upgrade: 10 });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.offhand).toBeNull();
    expect(resolved.armorPieces).toEqual([]);
    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.offhandIgnored]);
    expect(getStatTotal(resolved, 'allstats', false)).toBe(0);
  });

  it('keeps a shield behind a one-handed weapon and counts it as armor', () => {
    const build = createTestBuild(data);

    addWeapon(build, { itemId: MAW_OF_JUDGEMENT_ULTIMATE });
    addShield(build, {
      itemId: HELLS_GATE,
      upgrade: 10,
      skillAwake: { parameter: 'block', value: 15 },
      cards: [{ itemId: LAND_CARD_A, count: 5 }],
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.issues).toEqual([]);
    expect(resolved.offhand?.kind).toBe('shield');
    expect(resolved.armorPieces.map((piece) => piece.item.id)).toEqual([HELLS_GATE]);
    expect(getStatTotal(resolved, 'allstats', false)).toBe(15);
    expect(getStatTotal(resolved, 'sta', false)).toBe(15 + 30);
    expect(getStatTotal(resolved, 'block', true)).toBe(15);
    expect(getStatTotal(resolved, 'meleeblock', true)).toBe(0);
  });

  it('refuses a second weapon for non-Slayers and a shield for Slayers', () => {
    const seraph = createTestBuild(data);

    addWeapon(seraph, { itemId: MAW_OF_JUDGEMENT_ULTIMATE });
    addWeapon(seraph, { itemId: MAW_OF_JUDGEMENT_ULTIMATE }, 'offhand');
    expect(codes(resolveGearSwap(data, seraph, firstSwap(seraph)).issues)).toEqual([
      ENGINE_ISSUE_CODES.offhandIgnored,
    ]);

    const slayer = createTestBuild(data, { jobId: CLASS_IDS.slayer });

    addWeapon(slayer, { itemId: K_FANG_ULTIMATE });
    addShield(slayer, { itemId: HELLS_GATE });
    expect(codes(resolveGearSwap(data, slayer, firstSwap(slayer)).issues)).toEqual([
      ENGINE_ISSUE_CODES.offhandIgnored,
    ]);
  });

  it('lets Slayers dual-wield and counts the offhand weapon fully', () => {
    const build = createTestBuild(data, { jobId: CLASS_IDS.slayer });

    addWeapon(build, { itemId: K_FANG_ULTIMATE, upgrade: 10 });
    addWeapon(
      build,
      {
        itemId: SWORD_OF_WHISPER_ULTIMATE,
        upgrade: 7,
        statRanges: [18, 14, 5, 3, 10],
        jewels: [{ itemId: AMETHYST_10, count: 5 }],
      },
      'offhand',
    );

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.issues).toEqual([]);
    expect(resolved.offhand?.kind).toBe('weapon');
    expect(resolved.armorPieces).toEqual([]);
    expect(getStatTotal(resolved, 'sta', false)).toBe(14 + 50);
    expect(getStatTotal(resolved, 'maxhp', true)).toBe(18);
  });
});

describe('sets', () => {
  it('expands an equipment set to four pieces with awakes, cards and both set bonuses', () => {
    const build = createTestBuild(data);

    addEquipmentSet(build, {
      setId: ETRANAR_SET,
      upgrade: 10,
      statAwake: [{ stat: 'sta', value: 16 }, null],
      suitCards: [{ itemId: VOLCANO_CARD_7, count: 4 }],
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.issues).toEqual([]);
    expect(resolved.armorPieces.map((piece) => piece.item.subcategory)).toEqual([
      'helmet',
      'suit',
      'gauntlet',
      'boots',
    ]);
    expect(resolved.armorSetUpgradeLevel).toBe(10);
    expect(getStatTotal(resolved, 'sta', false)).toBe(16 + 8 + 10);
    expect(getStatTotal(resolved, 'maxhp', true)).toBe(28 + 20 + 35);
    expect(getStatTotal(resolved, 'maxmp', true)).toBe(5);
    expect(getStatTotal(resolved, 'hitrate', true)).toBe(45);
    expect(getStatTotal(resolved, 'pvedamagereduction', true)).toBe(12 + 7 + 7);
    expect(getStatTotal(resolved, 'decreasedcastingtime', true)).toBe(20);
  });

  it('has no set upgrade bonus at +0', () => {
    const build = createTestBuild(data);

    addEquipmentSet(build, { setId: ETRANAR_SET, upgrade: 0 });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.armorSetUpgradeLevel).toBe(0);
    expect(getStatTotal(resolved, 'hitrate', true)).toBe(0);
    expect(getStatTotal(resolved, 'allstats', false)).toBe(10);
  });

  it('reads accessories from their upgrade level and applies both bonus tiers', () => {
    const build = createTestBuild(data);

    addAccessorySet(build, {
      setId: ADEPTS_SET,
      earring1: 'plug',
      earring2: 'demol',
      necklace: 'gore',
      upgrades: { ring1: 10, ring2: 3, earring1: 10, earring2: 0, necklace: 5 },
    });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.issues).toEqual([]);
    expect(getStatTotal(resolved, 'int', false)).toBe(82 + 51);
    expect(getStatTotal(resolved, 'magicattack', true)).toBe(10 + 6 + 5);
    expect(getStatTotal(resolved, 'def', false)).toBe(610);
    expect(getStatTotal(resolved, 'damage', false)).toBe(460);
    expect(getStatTotal(resolved, 'maxhp', false)).toBe(1550);
    expect(getStatTotal(resolved, 'decreasedcastingtime', true)).toBe(10);
    expect(getStatTotal(resolved, 'mprecoveryafterkill', false)).toBe(500);
  });

  it('skips a necklace variant the set lacks and loses the five-piece bonus', () => {
    const build = createTestBuild(data);

    addAccessorySet(build, { setId: ADEPTS_SET, necklace: 'peision' });

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.accessoryVariantUnavailable]);
    expect(getStatTotal(resolved, 'magicattack', true)).toBe(5 + 5);
    expect(getStatTotal(resolved, 'mprecoveryafterkill', false)).toBe(500);
  });
});

describe('fashion, mask and pet', () => {
  it('aggregates speed, blessings, cloak, mask and pet lines', () => {
    const build = createTestBuild(data);

    addFashionSet(build, {
      speedPercent: 7,
      blessings: [
        { parameter: 'sta', total: 10 },
        { parameter: 'criticalchance', total: 2.5 },
        { parameter: 'nosuchstat', total: 3 },
      ],
      cloakItemId: CLOAK_OF_CORAL,
    });
    addPet(build, LION_PET, 75);
    firstSwap(build).maskItemId = HEALING_ANKOU_MASK;

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.unknownBlessing]);
    expect(getStatTotal(resolved, 'speed', true)).toBe(7 + 5);
    expect(getStatTotal(resolved, 'sta', false)).toBe(10 + 75);
    expect(getStatTotal(resolved, 'criticalchance', true)).toBe(2.5);
    expect(getStatTotal(resolved, 'maxhp', false)).toBe(200);
    expect(getStatTotal(resolved, 'healing', true)).toBe(1);
  });
});

describe('buffs', () => {
  it('maxes RM buffs with their INT scaling at the cap', () => {
    const beefUp = maxedSkillContributions(requireSkill(data, 690), 'rmBuff');
    const geburah = maxedSkillContributions(requireSkill(data, 6845), 'rmBuff');
    const spiritFortune = maxedSkillContributions(requireSkill(data, 9047), 'rmBuff');

    expect(beefUp).toMatchObject([{ parameter: 'str', add: 40, rate: false }]);
    expect(geburah).toMatchObject([
      { parameter: 'attack', add: 20, rate: true },
      { parameter: 'attackspeed', add: 15, rate: true },
      { parameter: 'decreasedcastingtime', add: 10, rate: true },
    ]);
    expect(spiritFortune).toMatchObject([{ parameter: 'damage', add: 350, rate: false }]);
  });

  it('honours the master switch and individual exclusions', () => {
    const build = createTestBuild(data, { rmBuffs: true });

    build.buffs.rmBuffs.excludedSkillIds = [690];

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(getStatTotal(resolved, 'str', false)).toBe(0);
    expect(getStatTotal(resolved, 'sta', false)).toBe(40);
    expect(getStatTotal(resolved, 'speed', true)).toBe(40);
    expect(getStatTotal(resolved, 'block', true)).toBe(20);

    // Buff resolution is memoised on the `buffs` object: state updates always produce a new one.
    build.buffs = { ...build.buffs, rmBuffs: { enabled: false, excludedSkillIds: [] } };
    expect(getStatTotal(resolveGearSwap(data, build, firstSwap(build)), 'sta', false)).toBe(0);
  });

  it('collects premium items, housing NPCs and achievements, flagging Upcut Stone', () => {
    const build = createTestBuild(data);

    build.buffs.premiumItemIds = [UPCUT_STONE_ITEM_ID, CHAMPIONS_BOUNTY_FLASK, 424242];
    // Temas (Speed +5%) + Hatter (PvE dmg +3%); Temas again in the couple house;
    // Gira (MP cost -10%), Quarter (HP +10%), Cobao (Healing +3%) on the guild ship.
    build.buffs.personalNpcIds = [12199, 12342];
    build.buffs.coupleNpcIds = [12199];
    build.buffs.guildNpcIds = [11693, 14035, 10508];
    build.buffs.achievementId = 5;

    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.hasUpcutStone).toBe(true);
    expect(codes(resolved.issues)).toEqual([ENGINE_ISSUE_CODES.unknownItem]);
    expect(getStatTotal(resolved, 'allstats', false)).toBe(10 + 20);
    expect(getStatTotal(resolved, 'speed', true)).toBe(10 + 5 + 5 + 5);
    expect(getStatTotal(resolved, 'pvedamage', true)).toBe(3);
    expect(getStatTotal(resolved, 'maxhp', true)).toBe(10);
    expect(getStatTotal(resolved, 'maxhp', false)).toBe(2000);
    expect(getStatTotal(resolved, 'healing', true)).toBe(3);
    expect(getStatTotal(resolved, 'decreasedmpconsumption', true)).toBe(10);
  });
});

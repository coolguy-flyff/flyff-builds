import { CLASS_IDS, requireItem, type GameData, type SlimItem } from '@/data';
import {
  createAccessorySetEntry,
  createDefaultBuild,
  createEquipmentSetEntry,
  createFashionSetEntry,
  createGearSwap,
  createPetEntry,
  createShieldEntry,
  createStatPage,
  createWeaponEntry,
} from '@/domain/build/defaults';
import { withWeaponItem, withWeaponUpgrade } from '@/domain/build/derive';
import type {
  AccessorySetEntry,
  BuildState,
  EquipmentSetEntry,
  FashionSetEntry,
  PetEntry,
  ShieldEntry,
  StatPage,
  WeaponEntry,
} from '@/domain/build/schema';
import { randomStatBounds, rangedAbilities, statRangeBounds, strongestValue } from '@/domain/rules';
import { requireDefined } from '@/lib/assert';

/** Game ids used by the fixtures (from the bundled data). */
export const FIXTURE_IDS = {
  oracle: 54987,
  mawOfJudgement: 11979,
  lusakasFist: 12648,
  hellsGate: 56920,
  azureShield: 469,
  etranarSet: 41091,
  goldenEtranarSet: 43747,
  adeptsSet: 12670,
  marksmansSet: 16509,
  championsSet: 17716,
  volcanoCard7: 2416,
  landCardA: 5666,
  fireCardA: 2517,
  thornCardA: 1961,
  amethyst10: 8177,
  runeOfBlockMelee: 10370,
  rainbowJewel3: 10073,
  lionCage: 9941,
  angelCage: 1644,
  dragonCloakOfTheMaster: 40,
  cloakOfCoral: 19985,
  hpMpGlasses: 2163,
  upcutStone: 8691,
  greenCottonCandy: 46,
  lowGrilledEel: 445,
  patience: 2678,
  beefUp: 690,
  fwcMaster: 5,
} as const;

/** A weapon entry with every ranged ability and random-stat line at its maximum. */
export function weaponAtMax(
  data: GameData,
  id: number,
  itemId: number,
  upgrade: number,
): WeaponEntry {
  const item = requireItem(data, itemId);
  const base = withWeaponUpgrade(
    data,
    withWeaponItem(data, createWeaponEntry(id), itemId),
    upgrade,
  );

  return {
    ...base,
    statRanges: rangedAbilities(item).map((ability) => strongestValue(statRangeBounds(ability))),
    randomStats: base.randomStats.map((line, index) =>
      line === null
        ? null
        : { parameter: line.parameter, value: maxRandomStatValue(item, line.parameter, index) },
    ),
  };
}

function maxRandomStatValue(item: SlimItem, parameter: string, lineIndex: number): number {
  const ability = requireDefined(
    item.possibleRandomStats?.find((candidate) => candidate.parameter === parameter),
    `${item.name} has no random stat ${parameter}`,
  );

  return strongestValue(randomStatBounds(ability, lineIndex));
}

function page(id: number, stats: Pick<StatPage, 'str' | 'sta' | 'dex' | 'int'>): StatPage {
  return { ...createStatPage(id), ...stats };
}

/**
 * A build using every field of the layout: named entries (unicode), several weapons with ranges,
 * random stats, cards, jewels and skill awakes (including a negative range), shields with skill
 * awakes, every accessory variant (peision on Champion's), fractional blessings, pets, all buff
 * lists, and swaps covering every slot and both offhand kinds.
 */
export function maximalBuild(data: GameData): BuildState {
  const ids = FIXTURE_IDS;
  const statPages: StatPage[] = [
    { ...page(1, { str: 15, sta: 393, dex: 15, int: 15 }), customName: 'Full STA' },
    { ...page(2, { str: 115, sta: 215, dex: 65, int: 43 }), customName: 'Hybrid ✨ Étranar' },
  ];
  const equipmentSets: EquipmentSetEntry[] = [
    {
      ...createEquipmentSetEntry(3, ids.etranarSet),
      customName: 'Etranar full HP',
      upgrade: 10,
      statAwake: [{ stat: 'sta', value: 16 }, null],
      suitCards: [{ itemId: ids.volcanoCard7, count: 4 }],
    },
    {
      ...createEquipmentSetEntry(4, ids.goldenEtranarSet),
      upgrade: 8,
      statAwake: [
        { stat: 'str', value: 12 },
        { stat: 'sta', value: 6 },
      ],
      suitCards: [],
    },
  ];
  const weapons: WeaponEntry[] = [
    {
      ...weaponAtMax(data, 5, ids.oracle, 10),
      customName: 'Oracle BiS',
      statAwake: [{ stat: 'sta', value: 4 }, null],
      skillAwake: { parameter: 'healing', value: 25 },
      cards: [
        { itemId: ids.landCardA, count: 6 },
        { itemId: ids.fireCardA, count: 4 },
      ],
      jewels: [
        { itemId: ids.amethyst10, count: 7 },
        // Runes can be slotted once per type.
        { itemId: ids.runeOfBlockMelee, count: 1 },
      ],
    },
    {
      ...weaponAtMax(data, 6, ids.mawOfJudgement, 8),
      statAwake: [
        { stat: 'dex', value: 2 },
        { stat: 'sta', value: 2 },
      ],
      cards: [{ itemId: ids.thornCardA, count: 5 }],
      jewels: [{ itemId: ids.rainbowJewel3, count: 8 }],
    },
    {
      ...weaponAtMax(data, 7, ids.lusakasFist, 0),
      customName: 'Fist (negative range)',
    },
    createWeaponEntry(8),
  ];
  const shields: ShieldEntry[] = [
    {
      ...createShieldEntry(9),
      itemId: ids.hellsGate,
      customName: "Hell's Gate",
      upgrade: 10,
      statAwake: [{ stat: 'str', value: 2 }, null],
      skillAwake: { parameter: 'block', value: 15 },
      cards: [{ itemId: ids.landCardA, count: 5 }],
    },
    {
      ...createShieldEntry(10),
      itemId: ids.azureShield,
      upgrade: 3,
      skillAwake: { parameter: 'reflectdamage', value: 10 },
    },
  ];
  const accessorySets: AccessorySetEntry[] = [
    {
      ...createAccessorySetEntry(11, ids.adeptsSet),
      customName: "Adept's +10",
      upgrades: { ring1: 10, ring2: 10, earring1: 10, earring2: 10, necklace: 10 },
    },
    {
      ...createAccessorySetEntry(12, ids.marksmansSet),
      earring1: 'demol',
      earring2: 'plug',
      necklace: 'mental',
      upgrades: { ring1: 7, ring2: 8, earring1: 9, earring2: 0, necklace: 5 },
    },
    {
      ...createAccessorySetEntry(13, ids.championsSet),
      earring1: 'demol',
      earring2: 'demol',
      necklace: 'peision',
      upgrades: { ring1: 10, ring2: 10, earring1: 6, earring2: 6, necklace: 10 },
    },
  ];
  const fashionSets: FashionSetEntry[] = [
    {
      ...createFashionSetEntry(14),
      customName: 'Crit fashion',
      speedPercent: 10,
      blessings: [
        { parameter: 'criticalchance', total: 2.5 },
        { parameter: 'sta', total: 40 },
        { parameter: 'def', total: 18 },
        { parameter: 'maxhp', total: 368 },
        { parameter: 'attack', total: 168 },
      ],
      cloakItemId: ids.dragonCloakOfTheMaster,
    },
    { ...createFashionSetEntry(15), speedPercent: 0 },
  ];
  const pets: PetEntry[] = [
    { ...createPetEntry(16, ids.lionCage, 75), customName: 'Lion 75' },
    createPetEntry(17, ids.angelCage, 27),
    createPetEntry(18, null, 0),
  ];

  return {
    ...createDefaultBuild(data),
    nextId: 23,
    character: { jobId: CLASS_IDS.seraph, level: 190 },
    statPages,
    equipmentSets,
    weapons,
    shields,
    accessorySets,
    fashionSets,
    pets,
    buffs: {
      rmBuffs: { enabled: true, excludedSkillIds: [ids.patience, ids.beefUp] },
      premiumItemIds: [ids.upcutStone, ids.greenCottonCandy, ids.lowGrilledEel],
      personalNpcIds: [12199, 12342, 11960],
      coupleNpcIds: [13117],
      guildNpcIds: [11693, 14035, 10508],
      achievementId: ids.fwcMaster,
    },
    gearSwaps: [
      {
        ...createGearSwap(19, 1),
        customName: 'Everything',
        equipmentSetId: 3,
        accessorySetId: 11,
        weaponId: 5,
        offhand: null,
        fashionSetId: 14,
        petId: 16,
        maskItemId: ids.hpMpGlasses,
      },
      {
        ...createGearSwap(20, 2),
        includeInResults: false,
        equipmentSetId: 4,
        accessorySetId: 13,
        weaponId: 6,
        offhand: { kind: 'shield', id: 9 },
        fashionSetId: 15,
        petId: 17,
      },
      {
        ...createGearSwap(21, 2),
        customName: 'Dual fists',
        weaponId: 6,
        offhand: { kind: 'weapon', id: 7 },
      },
      createGearSwap(22, 1),
    ],
  };
}

/** The plan's "etranar-oracle" style build: what a typical user shares. */
export function typicalBuild(data: GameData): BuildState {
  const ids = FIXTURE_IDS;

  return {
    ...createDefaultBuild(data),
    nextId: 11,
    statPages: [page(1, { str: 15, sta: 393, dex: 15, int: 15 })],
    equipmentSets: [
      {
        ...createEquipmentSetEntry(2, ids.etranarSet),
        upgrade: 10,
        statAwake: [{ stat: 'sta', value: 16 }, null],
        suitCards: [{ itemId: ids.volcanoCard7, count: 4 }],
      },
    ],
    weapons: [
      {
        ...weaponAtMax(data, 3, ids.oracle, 10),
        statAwake: [{ stat: 'sta', value: 4 }, null],
        skillAwake: { parameter: 'healing', value: 25 },
        cards: [{ itemId: ids.landCardA, count: 10 }],
        jewels: [{ itemId: ids.amethyst10, count: 10 }],
      },
      {
        ...weaponAtMax(data, 4, ids.mawOfJudgement, 8),
        cards: [{ itemId: ids.thornCardA, count: 5 }],
        jewels: [{ itemId: ids.amethyst10, count: 8 }],
      },
    ],
    shields: [
      {
        ...createShieldEntry(5),
        itemId: ids.hellsGate,
        upgrade: 10,
        skillAwake: { parameter: 'block', value: 15 },
        cards: [{ itemId: ids.landCardA, count: 5 }],
      },
    ],
    accessorySets: [
      {
        ...createAccessorySetEntry(6, ids.adeptsSet),
        upgrades: { ring1: 10, ring2: 10, earring1: 10, earring2: 10, necklace: 10 },
      },
    ],
    fashionSets: [
      {
        ...createFashionSetEntry(7),
        blessings: [
          { parameter: 'sta', total: 10 },
          { parameter: 'criticalchance', total: 2.5 },
        ],
        cloakItemId: ids.cloakOfCoral,
      },
    ],
    pets: [createPetEntry(8, ids.lionCage, 75)],
    buffs: {
      rmBuffs: { enabled: true, excludedSkillIds: [] },
      premiumItemIds: [ids.upcutStone],
      personalNpcIds: [12199, 12342],
      coupleNpcIds: [],
      guildNpcIds: [],
      achievementId: ids.fwcMaster,
    },
    gearSwaps: [
      {
        ...createGearSwap(9, 1),
        equipmentSetId: 2,
        accessorySetId: 6,
        weaponId: 3,
        fashionSetId: 7,
        petId: 8,
      },
      {
        ...createGearSwap(10, 1),
        equipmentSetId: 2,
        accessorySetId: 6,
        weaponId: 4,
        offhand: { kind: 'shield', id: 5 },
        fashionSetId: 7,
        petId: 8,
      },
    ],
  };
}

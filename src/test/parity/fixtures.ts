import { CLASS_IDS, UPCUT_STONE_ITEM_ID, type GameData } from '@/data';
import type { BuildState, GearSwap } from '@/domain/build/schema';
import { ENGINE_ISSUE_CODES } from '@/domain/engine';
import {
  addAccessorySet,
  addEquipmentSet,
  addFashionSet,
  addPet,
  addShield,
  addWeapon,
  createTestBuild,
  firstSwap,
} from '@/domain/engine/testing/builders';

/** The parity fixtures from plan C2, each exercising a different slice of the shorthand model. */
export interface ParityFixture {
  readonly name: string;
  readonly create: (data: GameData) => { readonly build: BuildState; readonly swap: GearSwap };
  /** Issue codes the engine is expected to raise (anything else fails the fixture). */
  readonly expectedIssueCodes: readonly string[];
}

const ETRANAR_SET = 41091;
const ZAYTHAR_SET = 21002;
const ORACLE_ULTIMATE = 54987;
const MAW_OF_JUDGEMENT_ULTIMATE = 11979;
const MAW_OF_JUDGEMENT_UNIQUE = 28487;
const K_FANG_ULTIMATE = 23879;
const SWORD_OF_WHISPER_ULTIMATE = 41690;
const HELLS_GATE = 56920;
const ADEPTS_SET = 12670;
const MARKSMANS_SET = 16509;
const DEFENDERS_SET = 16809;
const CHAMPIONS_SET = 17716;
/** CW jewel lines, by their "+1" item: Speedo (earring, block %) and Pep (necklace, HP). */
const SPEEDO_LINE = 2470;
const PEP_LINE = 4902;
const VOLCANO_CARD_7 = 2416;
const VOLCANO_CARD_4 = 4635;
const LIGHTNING_CARD_7 = 576;
const LAND_CARD_A = 5666;
const FIRE_CARD_A = 2517;
const AMETHYST_10 = 8177;
const ONYX_10 = 13522;
const RUNE_OF_ATTACK = 17105;
const CLOAK_OF_CORAL = 19985;
const STAR_SIGN_CLOAK = 1448;
const HEALING_ANKOU_MASK = 47992;
const LION_PET = 9941;
const ANGEL_PET = 1644;
const TIGER_PET = 5851;
const CHAMPIONS_BOUNTY_FLASK = 10918;
const GRILLED_EEL = 6049;
const POTION_OF_RECKLESSNESS = 1171;
const HASTE = 9852;
const GEBURAH_TIPHRETH = 6845;
const HEAVENS_STEP = 55834;
const KYRIE_ELEISON_EFFECT_INCREASE = 54836;
const HYMN_DAMAGE_REDUCTION = 47719;
const BERSERK = 4369;
const SWORD_MASTERY = 4927;
const AMBIDEXTROUS = 55233;
const MASTER_OF_SWORD = 41788;

const ALL_TEN = { ring1: 10, ring2: 10, earring1: 10, earring2: 10, necklace: 10 };

export const PARITY_FIXTURES: readonly ParityFixture[] = [
  {
    name: 'bare',
    expectedIssueCodes: [],
    create: (data) => {
      const build = createTestBuild(data, { stats: { sta: 400 } });

      return { build, swap: firstSwap(build) };
    },
  },
  {
    name: 'etranar-oracle',
    expectedIssueCodes: [],
    create: (data) => {
      const build = createTestBuild(data, {
        stats: { sta: 300, int: 108 },
        rmBuffs: true,
        // Heaven's Step carries a Cat's Reflex synergy; Kyrie (Effect Increase) is a variation.
        classSkillIds: [HEAVENS_STEP, KYRIE_ELEISON_EFFECT_INCREASE, HYMN_DAMAGE_REDUCTION],
      });

      addEquipmentSet(build, {
        setId: ETRANAR_SET,
        upgrade: 10,
        statAwake: [
          { stat: 'sta', value: 12 },
          { stat: 'int', value: 8 },
        ],
        suitCards: [{ itemId: VOLCANO_CARD_7, count: 4 }],
      });
      addWeapon(build, {
        itemId: ORACLE_ULTIMATE,
        upgrade: 10,
        statRanges: [22, 22, 42, 39, 10],
        randomStats: [
          { parameter: 'attack', value: 9 },
          { parameter: 'sta', value: 12 },
          { parameter: 'healing', value: 6 },
          { parameter: 'int', value: 6 },
        ],
        skillAwake: { parameter: 'healing', value: 25 },
        cards: [{ itemId: LIGHTNING_CARD_7, count: 10 }],
        jewels: [{ itemId: AMETHYST_10, count: 10 }],
        statAwake: [
          { stat: 'str', value: 2 },
          { stat: 'dex', value: 1 },
        ],
      });
      addAccessorySet(build, {
        setId: ADEPTS_SET,
        earring1: 'plug',
        earring2: 'demol',
        necklace: 'gore',
        upgrades: ALL_TEN,
      });
      addFashionSet(build, {
        speedPercent: 7,
        blessings: [
          { parameter: 'sta', total: 10 },
          { parameter: 'criticalchance', total: 2.5 },
        ],
        cloakItemId: CLOAK_OF_CORAL,
      });
      addPet(build, LION_PET, 75);

      const swap = firstSwap(build);

      swap.maskItemId = HEALING_ANKOU_MASK;
      build.buffs = {
        ...build.buffs,
        premiumItemIds: [UPCUT_STONE_ITEM_ID, CHAMPIONS_BOUNTY_FLASK],
        personalNpcIds: [12199, 12342],
        coupleNpcIds: [12199],
        guildNpcIds: [11693, 14035],
        achievementId: 5,
      };

      return { build, swap };
    },
  },
  {
    name: 'knuckle-shield',
    expectedIssueCodes: [ENGINE_ISSUE_CODES.jewelsExceedSlots],
    create: (data) => {
      const build = createTestBuild(data, { stats: { dex: 393 }, rmBuffs: true });

      build.buffs = {
        ...build.buffs,
        rmBuffs: { enabled: true, excludedSkillIds: [HASTE, GEBURAH_TIPHRETH] },
        premiumItemIds: [GRILLED_EEL],
        achievementId: 2,
      };
      addEquipmentSet(build, {
        setId: ETRANAR_SET,
        upgrade: 5,
        statAwake: [{ stat: 'str', value: 16 }, null],
      });
      // +8: eight jewel slots (one is ignored) and random line 4 still locked.
      addWeapon(build, {
        itemId: MAW_OF_JUDGEMENT_ULTIMATE,
        upgrade: 8,
        statRanges: [80.9, 44.6, 16.25, 10],
        jewels: [{ itemId: AMETHYST_10, count: 9 }],
        randomStats: [
          { parameter: 'criticaldamage', value: 13 },
          { parameter: 'blockpenetration', value: 13 },
          { parameter: 'criticalchance', value: 5 },
          { parameter: 'attack', value: 4.5 },
        ],
      });
      addShield(build, {
        itemId: HELLS_GATE,
        upgrade: 10,
        skillAwake: { parameter: 'block', value: 15 },
        cards: [{ itemId: FIRE_CARD_A, count: 5 }],
        statAwake: [
          { stat: 'sta', value: 2 },
          { stat: 'dex', value: 2 },
        ],
      });
      addAccessorySet(build, {
        setId: DEFENDERS_SET,
        earring1: 'demol',
        earring2: 'plug',
        necklace: 'peision',
        upgrades: { ring1: 7, ring2: 7, earring1: 7, earring2: 7, necklace: 7 },
      });
      addFashionSet(build, {
        speedPercent: 10,
        blessings: [
          { parameter: 'criticaldamage', total: 2.5 },
          { parameter: 'def', total: 20 },
        ],
        cloakItemId: null,
      });
      addPet(build, ANGEL_PET, 27);

      return { build, swap: firstSwap(build) };
    },
  },
  {
    name: 'no-buffs-partial',
    expectedIssueCodes: [],
    create: (data) => {
      const build = createTestBuild(data, { stats: { str: 200, sta: 208 } });

      addWeapon(build, { itemId: MAW_OF_JUDGEMENT_UNIQUE, upgrade: 3 });
      // Mixed: a Speedo +5 earring and a Pep +5 necklace among Marksman's pieces (3 of 5, so
      // no set bonus either).
      addAccessorySet(build, {
        setId: MARKSMANS_SET,
        earring1: 'demol',
        earring2: 'plug',
        necklace: 'mental',
        upgrades: { ring1: 3, ring2: 10, earring1: 0, earring2: 5, necklace: 5 },
        pieceSources: {
          ring1: null,
          ring2: null,
          earring1: null,
          earring2: SPEEDO_LINE,
          necklace: PEP_LINE,
        },
      });
      addFashionSet(build, { speedPercent: 0, blessings: [], cloakItemId: null });

      return { build, swap: firstSwap(build) };
    },
  },
  {
    name: 'slayer-dual',
    expectedIssueCodes: [],
    create: (data) => {
      const build = createTestBuild(data, {
        jobId: CLASS_IDS.slayer,
        level: 185,
        stats: { str: 200, dex: 183 },
        rmBuffs: true,
        // A self-buff, a weapon mastery (sword attack) and two third-job passives.
        classSkillIds: [BERSERK, SWORD_MASTERY, AMBIDEXTROUS, MASTER_OF_SWORD],
      });

      build.buffs = {
        ...build.buffs,
        premiumItemIds: [POTION_OF_RECKLESSNESS],
        guildNpcIds: [10508, 11693],
        achievementId: 4,
      };
      addEquipmentSet(build, {
        setId: ZAYTHAR_SET,
        upgrade: 8,
        statAwake: [
          { stat: 'str', value: 12 },
          { stat: 'sta', value: 8 },
        ],
        suitCards: [
          { itemId: VOLCANO_CARD_7, count: 2 },
          { itemId: VOLCANO_CARD_4, count: 2 },
        ],
      });
      addWeapon(build, {
        itemId: K_FANG_ULTIMATE,
        upgrade: 10,
        statRanges: [75, 32.2, 21, 5],
        randomStats: [
          { parameter: 'criticalchance', value: 6 },
          { parameter: 'str', value: 6 },
          { parameter: 'attack', value: 2.5 },
          { parameter: 'pvedamage', value: 3 },
        ],
        jewels: [{ itemId: ONYX_10, count: 7 }],
        cards: [{ itemId: FIRE_CARD_A, count: 5 }],
      });
      addWeapon(
        build,
        {
          itemId: SWORD_OF_WHISPER_ULTIMATE,
          upgrade: 7,
          statRanges: [18, 14, 5, 3, 10],
          randomStats: [
            { parameter: 'maxhp', value: 5 },
            { parameter: 'sta', value: 6 },
            { parameter: 'dex', value: 3 },
          ],
          jewels: [
            { itemId: RUNE_OF_ATTACK, count: 2 },
            { itemId: AMETHYST_10, count: 3 },
          ],
          cards: [{ itemId: LAND_CARD_A, count: 5 }],
        },
        'offhand',
      );
      addAccessorySet(build, {
        setId: CHAMPIONS_SET,
        earring1: 'plug',
        earring2: 'plug',
        necklace: 'peision',
        upgrades: ALL_TEN,
      });
      addFashionSet(build, {
        speedPercent: 10,
        blessings: [
          { parameter: 'str', total: 20 },
          { parameter: 'attackspeed', total: 6 },
        ],
        cloakItemId: STAR_SIGN_CLOAK,
      });
      addPet(build, TIGER_PET, 75);

      return { build, swap: firstSwap(build) };
    },
  },
];

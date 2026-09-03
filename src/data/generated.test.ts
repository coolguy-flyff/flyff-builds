import { describe, expect, it } from 'vitest';

import {
  ACCESSORY_LINE_NAMES,
  ACCESSORY_SET_IDS,
  BUNDLED_SKILL_IDS,
  CLASS_IDS,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  RM_BUFF_CLASS_IDS,
  RM_BUFF_SKILL_IDS,
  UPCUT_STONE_ITEM_ID,
} from './constants';
import { requireDefined } from '@/lib/assert';

import {
  accessoryLinesFor,
  classSkillsFor,
  getStatName,
  isAnteriorJob,
  loadBundledGameData,
  requireItem,
} from './index';

/**
 * Guards the committed tables: they must satisfy the schema and the structural invariants the
 * domain relies on. Runs against the real bundle (fast: ~1,300 items).
 */
describe('bundled game data', () => {
  const data = loadBundledGameData();

  it('has the eight third jobs with full class chains', () => {
    expect(data.thirdJobs.map((job) => job.name).sort()).toEqual([
      'Arcanist',
      'Crackshooter',
      'Forcemaster',
      'Harlequin',
      'Mentalist',
      'Seraph',
      'Slayer',
      'Templar',
    ]);

    for (const job of data.thirdJobs) {
      const chain = data.classChains.get(job.id);

      expect(chain?.length).toBe(4);
      expect(chain?.at(-1)).toBe(CLASS_IDS.vagrant);
    }

    expect(isAnteriorJob(data, CLASS_IDS.slayer, CLASS_IDS.blade)).toBe(true);
    expect(isAnteriorJob(data, CLASS_IDS.seraph, CLASS_IDS.blade)).toBe(false);
  });

  it('bundles the armor sets of the whole class chain with all four parts', () => {
    for (const job of data.thirdJobs) {
      const sets = data.armorSetsByJob.get(job.id) ?? [];

      // 8 third-job + 22 second-job + 8 first-job + 2 Vagrant sets.
      expect(sets.length, `${job.name} armor sets`).toBe(40);

      for (const set of sets) {
        for (const partId of Object.values(set.parts)) {
          expect(requireItem(data, partId).category).toBe('armor');
        }
      }
    }
  });

  it('bundles the four accessory sets with every referenced piece', () => {
    expect(data.accessorySets.map((set) => set.id).sort()).toEqual(
      Object.values(ACCESSORY_SET_IDS).sort(),
    );

    for (const set of data.accessorySets) {
      const ids = [
        set.ring,
        set.earrings.plug,
        set.earrings.demol,
        set.necklaces.gore,
        set.necklaces.mental,
      ];

      if (set.necklaces.peision !== undefined) {
        ids.push(set.necklaces.peision);
      }

      for (const id of ids) {
        expect(requireItem(data, id).upgradeLevels?.length).toBe(11);
      }
    }
  });

  it('bundles the CW jewel lines as contiguous tiers of real jewelry items', () => {
    expect(data.accessoryLines.map((line) => line.name)).toEqual([
      ...ACCESSORY_LINE_NAMES.ring,
      ...ACCESSORY_LINE_NAMES.earring,
      ...ACCESSORY_LINE_NAMES.necklace,
    ]);

    for (const line of data.accessoryLines) {
      const first = requireDefined(line.tiers[0], line.name);

      expect(line.id).toBe(first.itemId);

      for (const [index, tier] of line.tiers.entries()) {
        const item = requireItem(data, tier.itemId);

        expect(tier.upgrade).toBe(first.upgrade + index);
        expect(item.category).toBe('jewelry');
        expect(item.subcategory).toBe(line.slot);
        // A tier is its own item: plain abilities, no upgrade table.
        expect(item.upgradeLevels).toBeUndefined();
        expect(item.abilities?.length).toBeGreaterThan(0);
      }
    }

    // Five tiers everywhere except the single Meteor and Meteofy rings.
    expect(
      data.accessoryLines.filter((line) => line.tiers.length === 1).map((line) => line.name),
    ).toEqual(['Meteor', 'Meteofy']);
    expect(accessoryLinesFor(data, 'earring').map((line) => line.name)).toEqual([
      'Speedo',
      'Penzeru',
      'Mighteer',
    ]);
  });

  it('offers weapons and shields to every job and splits cards by slot', () => {
    for (const job of data.thirdJobs) {
      expect((data.weaponsByJob.get(job.id) ?? []).length, `${job.name} weapons`).toBeGreaterThan(
        30,
      );
      expect((data.shieldsByJob.get(job.id) ?? []).length, `${job.name} shields`).toBeGreaterThan(
        10,
      );
    }

    expect(data.suitCards.length).toBe(20);
    expect(data.weaponCards.length).toBe(32);
    expect(data.jewels.length).toBe(97);
  });

  it('bundles the skills, pets, awakes and powerups the app depends on', () => {
    for (const id of BUNDLED_SKILL_IDS) {
      expect(data.skills.has(id), `skill ${id}`).toBe(true);
    }

    expect(data.skills.get(HEAL_RAIN_SKILL_ID)?.levelCount).toBe(10);
    expect(data.skills.get(GLORIA_PATRI_SKILL_ID)?.levelCount).toBe(5);
    expect(data.pets.length).toBe(9);
    expect(data.statAwakes.length).toBe(48);
    expect(Object.keys(data.skillAwakes).sort()).toEqual([
      'bow',
      'knuckle',
      'shield',
      'staff',
      'stick',
      'swordoraxe',
      'wand',
      'wandorstaff',
      'yoyo',
    ]);
    expect(data.powerups.some((item) => item.id === UPCUT_STONE_ITEM_ID)).toBe(true);
    // Of 15 / 24 NPCs only those with a result-affecting stat remain (no EXP/drop/artifact/upgrade perks).
    expect(data.personalNpcs.map((npc) => npc.shortName)).toEqual([
      'Alice',
      'Temas',
      'Hatter',
      'BB Wolf',
    ]);
    expect(data.guildNpcs.length).toBe(13);
    expect(data.achievements.length).toBe(5);
  });

  it('names skill-chance abilities after their skill and mode', () => {
    // Lusaka's Stick: one PvE and one PvP stun chance, both on skill 7599 ("Stun").
    const stick = requireItem(data, 15880);
    const parameters = (stick.abilities ?? []).map((ability) => ability.parameter);

    expect(parameters).toContain('skillchance:7599:pve');
    expect(parameters).toContain('skillchance:7599:pvp');
    expect(getStatName(data, 'skillchance:7599:pve')).toBe('Stun chance (PvE)');
    expect(getStatName(data, 'skillchance:7599:pvp')).toBe('Stun chance (PvP)');
    expect(getStatName(data, 'skillchance:6824')).toBe('Poison chance');
    expect(getStatName(data, 'skillchance:424242')).toBe('skillchance:424242');
  });

  it('bundles the class skills of every job, the pet graces and synergy source levels', () => {
    expect(data.classSkills.size).toBe(128);

    for (const job of data.thirdJobs) {
      const skills = classSkillsFor(data, job.id);
      const chain = data.classChains.get(job.id) ?? [];

      expect(skills.length, `${job.name} class skills`).toBeGreaterThan(0);

      for (const skill of skills) {
        expect(chain).toContain(skill.classId);
        expect(RM_BUFF_CLASS_IDS).not.toContain(skill.classId);
        expect(RM_BUFF_SKILL_IDS).not.toContain(skill.id);
        expect(data.skills.get(skill.id)).toBe(skill);
      }
    }

    for (const pet of data.pets) {
      expect(pet.grace?.levels.length, `${pet.name} grace`).toBe(7);
      expect(pet.grace?.durationSeconds).toBe(20);
    }

    // Gloria Patri ↔ Heal: Heal has 20 levels, so the synergy sees 5 bonus levels above 15.
    expect(data.skills.get(GLORIA_PATRI_SKILL_ID)?.max.synergies[0]).toMatchObject({
      skill: 5653,
      sourceLevelCount: 20,
      minLevel: 15,
    });
  });
});

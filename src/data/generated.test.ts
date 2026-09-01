import { describe, expect, it } from 'vitest';

import {
  ACCESSORY_SET_IDS,
  BUNDLED_SKILL_IDS,
  CLASS_IDS,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  UPCUT_STONE_ITEM_ID,
} from './constants';
import { isAnteriorJob, loadBundledGameData, requireItem } from './index';

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
    expect(data.accessorySets.map((set) => set.id).sort()).toEqual([...ACCESSORY_SET_IDS].sort());

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
    expect(data.personalNpcs.length).toBe(15);
    expect(data.guildNpcs.length).toBe(24);
    expect(data.achievements.length).toBe(5);
  });
});

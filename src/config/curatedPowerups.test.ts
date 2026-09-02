import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { CURATED_POWERUP_IDS } from './curatedPowerups';

const data = loadBundledGameData();

/** The curated quick-toggle list (revised 2026-09-01), in display order. */
const EXPECTED_NAMES = [
  'Grilled Eel',
  'Upcut Stone',
  'Def-Upcut Stone',
  'Potion of Recklessness',
  'Concoction of Profuse Bleeding',
  'Potion of Clarity',
  'Elixir of the Sorcerer',
  'Scroll of Sprint',
  'Rainbow Cotton Candy',
  'White Cotton Candy',
  'Flask of the Tiger',
  'Flask of the Lion',
  'Flask of the Rabbit',
  'Flask of the Fox',
  'Super Charged Power Scroll',
  'Flyff Balloon',
  'Christmas Cookie',
  "Champion's Bounty Flask (30 Days)",
];

describe('CURATED_POWERUP_IDS', () => {
  it('lists each item once', () => {
    expect(new Set(CURATED_POWERUP_IDS).size).toBe(CURATED_POWERUP_IDS.length);
  });

  it('resolves every id to a bundled consumable that the search picker also offers', () => {
    for (const id of CURATED_POWERUP_IDS) {
      expect(data.items.get(id), `item #${id}`).toBeDefined();
      expect(
        data.powerups.some((item) => item.id === id),
        `powerup #${id}`,
      ).toBe(true);
    }
  });

  it('matches the curated names from the plan, in display order', () => {
    expect(CURATED_POWERUP_IDS.map((id) => data.items.get(id)?.name)).toEqual(EXPECTED_NAMES);
  });
});

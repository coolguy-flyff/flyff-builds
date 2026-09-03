import { describe, expect, it } from 'vitest';

import { loadBundledGameData, requireItem, requireSkill, UPCUT_STONE_ITEM_ID } from '@/data';

import {
  achievementShortName,
  effectTextOrNone,
  splitEffectText,
  maxedSkillEffect,
  powerupSearchText,
  premiumItemEffect,
} from './effectText';

const data = loadBundledGameData();
const BEEF_UP = 690;
const GEBURAH_TIPHRETH = 6845;
const HEAVENS_STEP = 55834;
const RED_LOVE_CANDY = 12772;

describe('maxedSkillEffect', () => {
  it('shows the maxed value including the caster-INT scaling cap', () => {
    expect(maxedSkillEffect(data, requireSkill(data, BEEF_UP), 'rmBuff')).toBe('STR +40');
    expect(maxedSkillEffect(data, requireSkill(data, GEBURAH_TIPHRETH), 'rmBuff')).toBe(
      'Attack +20% · Aspd +15% · Cast Speed +10%',
    );
  });

  it("includes a class skill's synergy with the source skill maxed", () => {
    // Heaven's Step: block/parry +10% at Lv 5, +2 per Cat's Reflex level above 15 (Lv 20 → +10).
    expect(maxedSkillEffect(data, requireSkill(data, HEAVENS_STEP), 'classSkill')).toBe(
      'Block +20% · Parry +20%',
    );
  });
});

describe('premiumItemEffect', () => {
  it('formats abilities and special-cases the Upcut Stone multiplier', () => {
    expect(premiumItemEffect(data, requireItem(data, RED_LOVE_CANDY))).toBe(
      'STR +10 · Hit Rate +8%',
    );
    expect(premiumItemEffect(data, requireItem(data, UPCUT_STONE_ITEM_ID))).toBe('Attack ×1.2');
  });
});

describe('effectTextOrNone', () => {
  it('marks sources without abilities', () => {
    expect(effectTextOrNone(data, [])).toBe('no stat effect');
  });
});

describe('powerupSearchText', () => {
  it('includes the full stat names so "hit" finds the Red Love Candy', () => {
    const text = powerupSearchText(data, requireItem(data, RED_LOVE_CANDY));

    expect(text).toContain('Red Love Candy');
    expect(text.toLowerCase()).toContain('hit');
  });
});

describe('splitEffectText', () => {
  it('splits an effect into one stat per line', () => {
    expect(splitEffectText('STR +10 · Hit Rate +8%')).toEqual(['STR +10', 'Hit Rate +8%']);
  });
});

describe('achievementShortName', () => {
  it('drops the event prefix', () => {
    expect(achievementShortName('2026 FWC Master')).toBe('Master');
  });
});

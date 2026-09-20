import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { createDefaultBuild, createShieldEntry, createStatPage } from './defaults';
import { autoShieldName, autoStatPageName, itemShortName, shortStatLabel } from './naming';

const data = loadBundledGameData();
const VEIL_OF_SHADE = 49291;
const LAND_CARD_A = 5666;

describe('itemShortName', () => {
  it('nicknames the long weapon and shield names', () => {
    expect(itemShortName('Leviathan')).toBe('Levi');
    expect(itemShortName('Nautilus')).toBe('Nauti');
    expect(itemShortName("Nemo's Fury")).toBe('Nemo');
    expect(itemShortName('Fist of Tides')).toBe('FoT');
    expect(itemShortName("Lamprey's Wand")).toBe('Lamprey');
    expect(itemShortName('Conch Staff')).toBe('Conch');
    expect(itemShortName('Coral Cutlass')).toBe('Cutlass');
    expect(itemShortName('Veil of Shade')).toBe('Veil');
    expect(itemShortName('Cleaver of the Mist')).toBe('Cleaver');
    expect(itemShortName('Jewel of Nightmare')).toBe('Jewel');
  });

  it('keeps the Cursed and Golden variants in front of the nickname', () => {
    expect(itemShortName('Maw of Judgement')).toBe('Maw');
    expect(itemShortName('Cursed Maw of Judgement')).toBe('Cursed Maw');
    expect(itemShortName('2026 FWC Golden Maw of Judgement')).toBe('Golden Maw');
    expect(itemShortName("Cursed Roika's Staff")).toBe('Cursed Roika');
    expect(itemShortName("2026 FWC Golden Roika's Staff")).toBe('Golden Roika');
    expect(itemShortName('Cursed Scepter of Disorder')).toBe('Cursed Scepter');
    expect(itemShortName('2026 FWC Golden Celestial Edge')).toBe('Golden Edge');
    expect(itemShortName("Cursed Butcher's Carnage")).toBe('Cursed Butcher');
  });

  it("abbreviates the FWC Golden Lusaka's Crystal weapons by year", () => {
    expect(itemShortName("FWC Golden Lusaka's Crystal Wand")).toBe("'24 GLC Wand");
    expect(itemShortName("FWC Golden Lusaka's Heavy Crystal Axe")).toBe("'24 GLC Heavy Axe");
    expect(itemShortName("2025 FWC Golden Lusaka's Crystal Yo-Yo")).toBe("'25 GLC Yo-Yo");
    expect(itemShortName("2025 FWC Golden Lusaka's Heavy Crystal Sword")).toBe(
      "'25 GLC Heavy Sword",
    );
  });

  it("abbreviates the plain Lusaka's Crystal line and the Legendary Golden weapons", () => {
    expect(itemShortName("Lusaka's Crystal Wand")).toBe('LC Wand');
    expect(itemShortName("Lusaka's Heavy Crystal Sword")).toBe('LC Heavy Sword');
    expect(itemShortName("Lusaka's Crystal Shield")).toBe('LC Shield');
    expect(itemShortName('Legendary Golden Wand')).toBe('LG Wand');
    expect(itemShortName('Legendary Golden Big Axe')).toBe('LG Big Axe');
    // The non-crystal Lusaka's weapons keep their name.
    expect(itemShortName("Lusaka's Wand")).toBe("Lusaka's Wand");
  });

  it('strips the FWC prefixes from every other item and keeps the rest verbatim', () => {
    expect(itemShortName('2026 FWC Golden Oracle')).toBe('Golden Oracle');
    expect(itemShortName('Oracle')).toBe('Oracle');
  });

  it('drops "Bloody" from the Obsidian weapons', () => {
    expect(itemShortName('Bloody Obsidian Wand')).toBe('Obsidian Wand');
    expect(itemShortName('Bloody Obsidian Executioner')).toBe('Obsidian Executioner');
  });
});

describe('shortStatLabel', () => {
  it('uses the in-game abbreviations for magic resistance and magical power', () => {
    expect(shortStatLabel(data, 'magicdefense')).toBe('MR');
    expect(shortStatLabel(data, 'magicattack')).toBe('M.Pwr');
  });
});

describe('autoStatPageName', () => {
  const build = createDefaultBuild(data);
  const page = (stats: Partial<Record<'str' | 'sta' | 'dex' | 'int', number>>) => ({
    ...createStatPage(1),
    ...stats,
  });

  it('names a single raised stat "Full"', () => {
    expect(autoStatPageName(build, page({ sta: 400 }))).toBe('Full STA');
    expect(autoStatPageName(build, page({ int: 16 }))).toBe('Full INT');
  });

  it('lists several raised stats by allocated points, descending', () => {
    expect(autoStatPageName(build, page({ sta: 215, dex: 115 }))).toBe('STA/DEX');
    expect(autoStatPageName(build, page({ sta: 115, dex: 215 }))).toBe('DEX/STA');
    expect(autoStatPageName(build, page({ str: 50, sta: 50, int: 60 }))).toBe('INT/STR/STA');
  });

  it('falls back to the page number with nothing allocated', () => {
    expect(autoStatPageName(build, page({}))).toBe('Page 1');
  });
});

describe('autoShieldName', () => {
  const veil = { ...createShieldEntry(1), itemId: VEIL_OF_SHADE, upgrade: 10 };

  it('names a stat awake once when it is also the dominant stat', () => {
    const blocked = { ...veil, skillAwake: { parameter: 'block', value: 15 } };

    expect(autoShieldName(data, blocked)).toBe('Block Veil +10');
  });

  it('leads with the dominant stat when cards outweigh the awake', () => {
    const blocked = {
      ...veil,
      skillAwake: { parameter: 'block', value: 15 },
      cards: [{ itemId: LAND_CARD_A, count: 4 }],
    };

    expect(autoShieldName(data, blocked)).toBe('STA Block Veil +10');
  });
});

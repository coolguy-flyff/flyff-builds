// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CURATED_POWERUP_IDS } from '@/config/curatedPowerups';
import { createMemoryStorage, STORAGE_KEYS, type StorageAdapter } from '@/persistence';

import { BuffsPage } from './BuffsPage';
import { renderWithStore } from './renderWithStore';
import { createTestStore, testGameData } from './testStore';

const BEEF_UP = 690;
const GRILLED_EEL = 6049;
const LOW_GRILLED_EEL = 445;
const TEMAS = 12199;
const GIRA = 11693;
const STAMINA_BOOST = 14733;
const MASTER_ACHIEVEMENT = 5;

function setup() {
  const store = createTestStore();
  renderWithStore(<BuffsPage />, store);

  return store;
}

afterEach(cleanup);

/** The RM card starts collapsed; its rows only exist once the title is clicked. */
function expandRmBuffs(): void {
  fireEvent.click(screen.getByRole('button', { name: /Max RM buffs/ }));
}

describe('RM buffs card', () => {
  it('starts collapsed with the master switch and count in the title row', () => {
    const store = setup();

    expect(screen.queryByLabelText('Beef Up')).toBeNull();
    expect(screen.getByText('12 / 12')).toBeDefined();
    expect(screen.getByRole('button', { name: /Max RM buffs/ }).getAttribute('aria-expanded')).toBe(
      'false',
    );

    fireEvent.click(screen.getByLabelText('Max RM buffs'));
    expect(store.getState().build.buffs.rmBuffs.enabled).toBe(false);
    expect(screen.getByText('0 / 12')).toBeDefined();

    expandRmBuffs();
    expect(screen.getByLabelText('Beef Up')).toBeDefined();
  });

  it('disables every buff row while the master switch is off', () => {
    const store = setup();

    expandRmBuffs();
    expect(screen.getByLabelText('Beef Up').getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByLabelText('Max RM buffs'));

    expect(store.getState().build.buffs.rmBuffs.enabled).toBe(false);
    expect(screen.getByLabelText('Beef Up')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Beef Up').getAttribute('aria-checked')).toBe('false');
  });

  it('toggling a row excludes and re-includes the skill', () => {
    const store = setup();

    expandRmBuffs();
    fireEvent.click(screen.getByLabelText('Beef Up'));

    expect(store.getState().build.buffs.rmBuffs.excludedSkillIds).toEqual([BEEF_UP]);
    expect(screen.getByLabelText('Beef Up').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByLabelText('Beef Up'));

    expect(store.getState().build.buffs.rmBuffs.excludedSkillIds).toEqual([]);
  });
});

describe('Premium items card', () => {
  it('quick toggles add and remove the item', () => {
    const store = setup();

    fireEvent.click(screen.getByLabelText('Grilled Eel'));

    expect(store.getState().build.buffs.premiumItemIds).toEqual([GRILLED_EEL]);

    fireEvent.click(screen.getByLabelText('Grilled Eel'));

    expect(store.getState().build.buffs.premiumItemIds).toEqual([]);
  });

  it('renders active items outside the curated list as tiles with a remove button', () => {
    const store = createTestStore();
    store.getState().actions.toggleIdInList('premiumItemIds', LOW_GRILLED_EEL);
    renderWithStore(<BuffsPage />, store);

    expect(screen.getByLabelText('Remove Low Grilled Eel')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Remove Low Grilled Eel'));

    expect(store.getState().build.buffs.premiumItemIds).toEqual([]);
  });
});

describe('Housing NPCs card', () => {
  it('lists only active NPCs until the group is edited', () => {
    const store = setup();
    const group = screen.getByRole('region', { name: 'Personal house' });

    expect(within(group).queryByLabelText('Personal house: Temas')).toBeNull();

    fireEvent.click(within(group).getByRole('button', { name: /edit/ }));
    fireEvent.click(within(group).getByLabelText('Personal house: Temas'));

    expect(store.getState().build.buffs.personalNpcIds).toEqual([TEMAS]);
    expect(store.getState().build.buffs.coupleNpcIds).toEqual([]);

    fireEvent.click(within(group).getByRole('button', { name: /done/ }));

    expect(within(group).getByLabelText('Remove Personal house: Temas')).toBeDefined();
    expect(within(group).queryByLabelText('Remove Personal house: Alice')).toBeNull();
    expect(screen.getByText('1 active')).toBeDefined();
  });
});

describe('Housing NPCs group switch', () => {
  it('places every NPC of the house at once and removes them all again', () => {
    const store = setup();
    const guildNpcCount = testGameData().guildNpcs.length;
    const allGuild = screen.getByLabelText('All Guild ship NPCs');

    store.getState().actions.toggleIdInList('guildNpcIds', GIRA);
    fireEvent.click(allGuild);

    const placed = store.getState().build.buffs.guildNpcIds;

    expect(placed).toHaveLength(guildNpcCount);
    // Already placed NPCs keep their place.
    expect(placed[0]).toBe(GIRA);
    expect(allGuild.getAttribute('aria-checked')).toBe('true');
    expect(store.getState().build.buffs.personalNpcIds).toEqual([]);

    fireEvent.click(allGuild);

    expect(store.getState().build.buffs.guildNpcIds).toEqual([]);
  });

  it('turns off when one NPC is taken away', () => {
    const store = setup();
    const allCouple = screen.getByLabelText('All Couple house NPCs');

    fireEvent.click(allCouple);
    fireEvent.click(screen.getByLabelText('Remove Couple house: Temas'));

    expect(store.getState().build.buffs.coupleNpcIds).not.toContain(TEMAS);
    expect(allCouple.getAttribute('aria-checked')).toBe('false');
  });
});

describe('Couple skills card', () => {
  it('offers only skills that reach the results and toggles them', () => {
    const store = setup();

    expect(screen.queryByLabelText('Golden Luck')).toBeNull();
    expect(screen.queryByLabelText("Sky's Blessing")).toBeNull();

    fireEvent.click(screen.getByLabelText('Stamina Boost'));

    expect(store.getState().build.buffs.coupleSkillIds).toEqual([STAMINA_BOOST]);
  });

  it('switches every couple skill on and off from the title', () => {
    const store = setup();

    fireEvent.click(screen.getByLabelText('All couple skills'));

    expect(store.getState().build.buffs.coupleSkillIds).toEqual(
      testGameData().coupleSkills.map((skill) => skill.id),
    );

    fireEvent.click(screen.getByLabelText('All couple skills'));

    expect(store.getState().build.buffs.coupleSkillIds).toEqual([]);
  });
});

describe('Premium favorites', () => {
  function storedFavorites(storage: StorageAdapter): unknown {
    return JSON.parse(storage.get(STORAGE_KEYS.premiumFavorites) ?? 'null');
  }

  function setupWith(storage: StorageAdapter) {
    const store = createTestStore(testGameData(), storage);
    renderWithStore(<BuffsPage />, store);

    return store;
  }

  it('saves the curated list as the favorites on first run', () => {
    const storage = createMemoryStorage();

    setupWith(storage);

    expect(storedFavorites(storage)).toEqual(CURATED_POWERUP_IDS);
  });

  it('offers the saved favorites as quick toggles', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.premiumFavorites]: JSON.stringify([LOW_GRILLED_EEL]),
    });
    const store = setupWith(storage);

    expect(screen.queryByLabelText('Grilled Eel')).toBeNull();

    fireEvent.click(screen.getByLabelText('Low Grilled Eel'));

    expect(store.getState().build.buffs.premiumItemIds).toEqual([LOW_GRILLED_EEL]);
  });

  it('keeps an active item that is not a favorite and stars it on request', () => {
    const storage = createMemoryStorage();
    const store = createTestStore(testGameData(), storage);
    store.getState().actions.toggleIdInList('premiumItemIds', LOW_GRILLED_EEL);
    renderWithStore(<BuffsPage />, store);

    fireEvent.click(screen.getByLabelText('Add Low Grilled Eel to favorites'));

    expect(storedFavorites(storage)).toEqual([...CURATED_POWERUP_IDS, LOW_GRILLED_EEL]);
    expect(screen.queryByLabelText('Remove Low Grilled Eel')).toBeNull();
    expect(screen.getByLabelText('Low Grilled Eel').getAttribute('aria-checked')).toBe('true');
  });

  it('removes a favorite in edit mode and resets to the defaults after confirming', () => {
    const storage = createMemoryStorage();
    const store = setupWith(storage);

    fireEvent.click(screen.getByRole('button', { name: 'Edit favorites' }));
    fireEvent.click(screen.getByLabelText('Remove Grilled Eel from favorites'));

    expect(storedFavorites(storage)).not.toContain(GRILLED_EEL);
    expect(screen.queryByText('Grilled Eel')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'reset to defaults' }));
    const dialog = store.getState().ui.dialog;

    if (dialog?.kind !== 'confirm') {
      throw new Error('expected a confirm dialog');
    }

    act(() => {
      dialog.onConfirm(false);
    });

    expect(storedFavorites(storage)).toEqual(CURATED_POWERUP_IDS);
    expect(screen.getByLabelText('Remove Grilled Eel from favorites')).toBeDefined();
  });
});

describe('Achievement card', () => {
  it('selects an achievement and shows its bonus', () => {
    const store = setup();

    fireEvent.click(screen.getByRole('radio', { name: 'Master' }));

    expect(store.getState().build.buffs.achievementId).toBe(MASTER_ACHIEVEMENT);
    expect(screen.getByText(/^All Stats \+20 · HP \+2000/)).toBeDefined();

    fireEvent.click(screen.getByRole('radio', { name: 'None' }));

    expect(store.getState().build.buffs.achievementId).toBeNull();
  });
});

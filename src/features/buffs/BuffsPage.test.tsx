// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BuffsPage } from './BuffsPage';
import { renderWithStore } from './renderWithStore';
import { createTestStore } from './testStore';

const BEEF_UP = 690;
const GRILLED_EEL = 6049;
const LOW_GRILLED_EEL = 445;
const TEMAS = 12199;
const MASTER_ACHIEVEMENT = 5;

function setup() {
  const store = createTestStore();
  renderWithStore(<BuffsPage />, store);

  return store;
}

afterEach(cleanup);

describe('RM buffs card', () => {
  it('disables every buff row while the master switch is off', () => {
    const store = setup();

    expect(screen.getByLabelText('Beef Up').getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByLabelText('Max RM buffs'));

    expect(store.getState().build.buffs.rmBuffs.enabled).toBe(false);
    expect(screen.getByLabelText('Beef Up')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Beef Up').getAttribute('aria-checked')).toBe('false');
  });

  it('toggling a row excludes and re-includes the skill', () => {
    const store = setup();

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

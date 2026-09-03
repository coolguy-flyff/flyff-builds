// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ClassSkillsCard } from './ClassSkillsCard';
import { renderWithStore } from './renderWithStore';
import { createTestStore } from './testStore';

const HEAVENS_STEP = 55834;
const HEAVENS_STEP_EFFECT_INCREASE = 23194;
const HYMN_DAMAGE_REDUCTION = 47719;

function setup() {
  const store = createTestStore();
  renderWithStore(<ClassSkillsCard />, store);

  return store;
}

function tile(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

afterEach(cleanup);

describe('ClassSkillsCard', () => {
  it('starts with the permanent passives on and buffs off, self-buffs under "Class buffs"', () => {
    setup();

    expect(tile('Hymn - Damage Reduction').getAttribute('aria-pressed')).toBe('true');
    expect(tile("Heaven's Step").getAttribute('aria-pressed')).toBe('false');

    const buffs = screen.getByRole('region', { name: 'Class buffs' });

    expect(within(buffs).getByRole('button', { name: "Heaven's Step" })).toBeDefined();
    expect(screen.queryByRole('region', { name: 'Self buffs' })).toBeNull();
    // Name and stats live in the tooltip, not in the tile.
    expect(tile("Heaven's Step").textContent).toBe('');
    expect(screen.getAllByText('Block +20%').length).toBeGreaterThan(0);
  });

  it('draws a skill and its variations as one numbered chain, one active at a time', () => {
    const store = setup();
    const active = (): number[] => store.getState().build.buffs.classSkillIds;
    const chain = screen.getByRole('group', { name: "Heaven's Step variations" });

    // Base first, then the variations in skill-list order, numbered from II.
    expect(
      within(chain)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['', 'II', 'III']);
    expect(
      within(chain).getByRole('button', { name: "Heaven's Step (Effect Increase)" }).textContent,
    ).toBe('III');
    expect(within(chain).getAllByText('Master variation')).toHaveLength(2);

    fireEvent.click(tile("Heaven's Step"));
    expect(active()).toContain(HEAVENS_STEP);

    fireEvent.click(tile("Heaven's Step (Effect Increase)"));
    expect(active()).toContain(HEAVENS_STEP_EFFECT_INCREASE);
    expect(active()).not.toContain(HEAVENS_STEP);
    expect(tile("Heaven's Step").getAttribute('aria-pressed')).toBe('false');
    expect(tile("Heaven's Step (Effect Increase)").getAttribute('aria-pressed')).toBe('true');
  });

  it('switches a whole group off and on with the group links', () => {
    const store = setup();
    const passives = screen.getByRole('region', { name: 'Passives' });

    fireEvent.click(within(passives).getByRole('button', { name: 'All passives off' }));
    expect(store.getState().build.buffs.classSkillIds).toEqual([]);

    fireEvent.click(within(passives).getByRole('button', { name: 'All passives on' }));
    expect(store.getState().build.buffs.classSkillIds).toContain(HYMN_DAMAGE_REDUCTION);
  });

  it('locks skills above the character level and keeps a selected one for later', () => {
    const store = setup();
    const { actions } = store.getState();

    fireEvent.click(tile("Heaven's Step"));
    act(() => {
      actions.setLevel(170);
    });

    // Heaven's Step needs Lv 175: inert and unlit, but still selected; Hymn (Lv 166) stays on.
    expect(tile("Heaven's Step")).toHaveProperty('disabled', true);
    expect(tile("Heaven's Step").getAttribute('aria-pressed')).toBe('false');
    expect(store.getState().build.buffs.classSkillIds).toContain(HEAVENS_STEP);
    // The whole Lv 175 chain (base + two variations) is locked.
    expect(
      within(screen.getByRole('group', { name: "Heaven's Step variations" })).getAllByText(
        'Requires Lv 175 — character is Lv 170',
      ),
    ).toHaveLength(3);
    expect(tile('Hymn - Damage Reduction')).toHaveProperty('disabled', false);

    // "all" only switches on what the level allows.
    const buffs = screen.getByRole('region', { name: 'Class buffs' });

    fireEvent.click(within(buffs).getByRole('button', { name: 'All class buffs off' }));
    fireEvent.click(within(buffs).getByRole('button', { name: 'All class buffs on' }));
    expect(store.getState().build.buffs.classSkillIds).not.toContain(HEAVENS_STEP);

    act(() => {
      actions.setLevel(190);
    });
    expect(tile("Heaven's Step")).toHaveProperty('disabled', false);
  });
});

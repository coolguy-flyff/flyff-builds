// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PVP_TARGET_PRESETS } from '@/config/pvpTargets';
import { createPvpTarget } from '@/domain/build';
import {
  DUMMY_TARGET_CHOICE,
  listDamageTargets,
  type DamageTarget,
  type DamageTargetChoice,
} from '@/domain/engine';
import { requireDefined } from '@/lib/assert';

import { TargetPicker } from './TargetPicker';

afterEach(cleanup);

const LEVEL = 190;
const PRESET_KEY = 'preset:balanced';
const GUILDIE = createPvpTarget(5, 'Guildie', requireDefined(PVP_TARGET_PRESETS[0], 'preset'));

function renderPicker(
  onChange = vi.fn(),
  targets: readonly DamageTarget[] = listDamageTargets(LEVEL),
  choice: DamageTargetChoice = DUMMY_TARGET_CHOICE,
): HTMLSelectElement {
  render(<TargetPicker targets={targets} choice={choice} onChange={onChange} />);

  return screen.getByLabelText<HTMLSelectElement>('Target');
}

function tooltip(): HTMLElement | null {
  return screen.queryByRole('tooltip');
}

describe('TargetPicker', () => {
  it('lists the dummy, the presets and the build’s custom targets in groups', () => {
    const onChange = vi.fn();
    const select = renderPicker(onChange, listDamageTargets(LEVEL, [GUILDIE]));
    const groups = [...select.querySelectorAll('optgroup')].map((group) => group.label);

    expect(groups).toEqual(['Presets', 'Custom']);
    expect(screen.getByRole('option', { name: 'Guildie' })).toBeDefined();

    fireEvent.change(select, { target: { value: 'custom:5' } });

    expect(onChange).toHaveBeenCalledWith({ kind: 'custom', id: 5 });
  });

  it('shows the dummy for a choice nothing answers to, as the engine does', () => {
    const select = renderPicker(vi.fn(), listDamageTargets(LEVEL), { kind: 'custom', id: 42 });

    expect(select.value).toBe('dummy');
  });

  it('shows the numbers of the chosen target while hovered', () => {
    const select = renderPicker(vi.fn(), listDamageTargets(LEVEL), {
      kind: 'preset',
      id: 'balanced',
    });

    expect(tooltip()).toBeNull();

    fireEvent.mouseEnter(select);

    expect(tooltip()?.textContent).toContain('Crit resist');
    expect(tooltip()?.textContent).toContain('Magic resistance');

    fireEvent.mouseLeave(select);

    expect(tooltip()).toBeNull();
  });

  it('stays hidden after a mouse pick, even though the select keeps the focus', () => {
    const onChange = vi.fn();
    const select = renderPicker(onChange);

    fireEvent.mouseEnter(select);
    fireEvent.pointerDown(select);
    fireEvent.focus(select);
    fireEvent.change(select, { target: { value: PRESET_KEY } });

    expect(onChange).toHaveBeenCalledWith({ kind: 'preset', id: 'balanced' });
    expect(tooltip()).toBeNull();

    // Chrome closes the native popup with the pointer outside the select.
    fireEvent.mouseLeave(select);

    expect(tooltip()).toBeNull();

    fireEvent.mouseEnter(select);

    expect(tooltip()).not.toBeNull();

    fireEvent.mouseLeave(select);

    expect(tooltip()).toBeNull();
  });

  it('follows a keyboard focus and comes back after the focus leaves', () => {
    const select = renderPicker();

    fireEvent.focus(select);

    expect(tooltip()).not.toBeNull();

    fireEvent.keyDown(select, { key: 'ArrowDown' });
    fireEvent.change(select, { target: { value: PRESET_KEY } });

    expect(tooltip()).toBeNull();

    fireEvent.blur(select);
    fireEvent.focus(select);

    expect(tooltip()).not.toBeNull();
  });
});

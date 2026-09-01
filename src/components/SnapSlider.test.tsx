// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SnapSlider } from './SnapSlider';

afterEach(cleanup);

describe('SnapSlider', () => {
  it('maps the range position to the allowed values and jumps to max', () => {
    const onChange = vi.fn();
    const options = [1, 2, 3, 4];

    render(
      <SnapSlider
        label="STA awake"
        options={options}
        value={2}
        onChange={onChange}
        format={(value) => `+${value}`}
        showMax
      />,
    );

    const slider = screen.getByLabelText('STA awake');

    expect(slider.getAttribute('value')).toBe('1');
    expect(screen.getByText('+2')).toBeTruthy();

    fireEvent.change(slider, { target: { value: '3' } });
    expect(onChange).toHaveBeenLastCalledWith(4);

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });
});

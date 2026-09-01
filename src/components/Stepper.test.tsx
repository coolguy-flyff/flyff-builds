// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Stepper } from './Stepper';

afterEach(cleanup);

describe('Stepper', () => {
  it('steps by 1, 10 with Shift and 100 with Ctrl, clamped to the range', () => {
    const onChange = vi.fn();

    render(<Stepper label="Level" value={180} min={165} max={190} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Increase Level'));
    fireEvent.click(screen.getByLabelText('Increase Level'), { shiftKey: true });
    fireEvent.click(screen.getByLabelText('Decrease Level'), { ctrlKey: true });

    expect(onChange.mock.calls).toEqual([[181], [190], [165]]);
  });

  it('commits typed values on Enter and reports clamping', () => {
    const onChange = vi.fn();
    const onClamp = vi.fn();

    render(
      <Stepper label="STA" value={15} min={15} max={393} onChange={onChange} onClamp={onClamp} />,
    );

    const input = screen.getByLabelText('STA');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onClamp).toHaveBeenCalledWith(500, 393);
    expect(onChange).toHaveBeenCalledWith(393);
  });

  it('quick picks apply their value and show the active one', () => {
    const onChange = vi.fn();

    render(
      <Stepper
        label="Upgrade"
        value={10}
        min={0}
        max={10}
        quickPicks={[0, 5, 8, 10]}
        format={(value) => `+${value}`}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: '+10' }).getAttribute('data-active')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '+5' }));

    expect(onChange).toHaveBeenCalledWith(5);
  });
});

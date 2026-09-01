// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InlineName } from './InlineName';

afterEach(cleanup);

describe('InlineName', () => {
  it('shows the auto name until a custom name is committed', () => {
    const onChange = vi.fn();

    render(<InlineName customName={undefined} autoName="Page 1" onChange={onChange} />);

    expect(screen.getByText('Page 1')).toBeTruthy();
    expect(screen.getByText('auto name')).toBeTruthy();

    fireEvent.keyDown(screen.getByText('Page 1'), { key: 'F2' });

    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '  Full STA  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('Full STA');
  });

  it('reverts to the auto name when the text is cleared or restored', () => {
    const onChange = vi.fn();

    render(<InlineName customName="Custom" autoName="Page 1" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Restore auto name'));

    expect(onChange).toHaveBeenLastCalledWith(undefined);

    fireEvent.click(screen.getByLabelText('Rename'));
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});

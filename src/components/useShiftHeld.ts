import { useEffect, useState } from 'react';

const SHIFT_KEY = 'Shift';

/** Text fields take Shift for capitals, which must not flip a list into another mode. */
function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  );
}

/**
 * Whether Shift is held right now, for "hold Shift for the quick variant" modes. Presses while
 * typing in a text field do not count. Losing the window focus clears it, because the release
 * of a key held while switching away never reaches the page.
 */
export function useShiftHeld(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === SHIFT_KEY && !isTextEntry(event.target)) {
        setHeld(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === SHIFT_KEY) {
        setHeld(false);
      }
    };

    const release = (): void => {
      setHeld(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
    };
  }, []);

  return held;
}

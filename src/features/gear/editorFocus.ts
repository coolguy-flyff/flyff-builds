const FIRST_CONTROL_SELECTOR =
  'input:not([disabled]), select:not([disabled]), [role="radio"]:not([disabled])';

/** Focuses the first field of an editor (plan A2.0: Enter / new entry → first control). */
export function focusFirstControl(container: HTMLElement | null): void {
  container?.querySelector<HTMLElement>(FIRST_CONTROL_SELECTOR)?.focus();
}

const SCROLL_MARGIN = 16;

/**
 * On narrow screens the list sits above the editor; selecting a row brings the editor on screen
 * when its top is currently outside the viewport. No-op when it is already visible.
 */
export function scrollEditorIntoView(container: HTMLElement | null): void {
  if (container === null) {
    return;
  }

  const { top } = container.getBoundingClientRect();

  if (top < 0 || top > window.innerHeight) {
    window.scrollTo({ top: window.scrollY + top - SCROLL_MARGIN, behavior: 'smooth' });
  }
}

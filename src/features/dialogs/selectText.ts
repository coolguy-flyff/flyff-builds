/** Selects an element's text so the user can copy it by hand when the clipboard API is unavailable. */
export function selectElementText(element: HTMLElement): void {
  const selection = window.getSelection();

  if (selection !== null) {
    selection.removeAllRanges();
    selection.selectAllChildren(element);
  }
}

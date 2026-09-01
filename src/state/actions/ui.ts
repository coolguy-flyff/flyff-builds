import type { EntryListKey, GearListKey } from '@/domain/build';

import type { DialogState, ResultsView, SaveStatus, Toast, ToastKind } from '../types';

import type { ActionContext } from './shared';

export interface UiActions {
  setGearCategory(category: GearListKey): void;
  selectEntry(list: EntryListKey, id: number | null): void;
  setExpandedSwap(id: number | null): void;
  updateResultsView(patch: Partial<ResultsView>): void;
  openDialog(dialog: NonNullable<DialogState>): void;
  closeDialog(): void;
  pushToast(kind: ToastKind, message: string, details?: readonly string[]): number;
  dismissToast(id: number): void;
  setSaveStatus(status: SaveStatus): void;
}

const MAX_TOASTS = 5;

export function createUiActions({ set }: ActionContext): UiActions {
  let nextToastId = 1;

  return {
    setGearCategory(category) {
      set((draft) => {
        draft.ui.gearCategory = category;
      });
    },

    selectEntry(list, id) {
      set((draft) => {
        draft.ui.selected[list] = id;
      });
    },

    setExpandedSwap(id) {
      set((draft) => {
        draft.ui.expandedSwapId = id;
      });
    },

    updateResultsView(patch) {
      set((draft) => {
        Object.assign(draft.ui.results, patch);
      });
    },

    openDialog(dialog) {
      set((draft) => {
        draft.ui.dialog = dialog;
      });
    },

    closeDialog() {
      set((draft) => {
        draft.ui.dialog = null;
      });
    },

    pushToast(kind, message, details) {
      const id = nextToastId;
      nextToastId += 1;

      set((draft) => {
        const toast: Toast =
          details === undefined ? { id, kind, message } : { id, kind, message, details };
        draft.ui.toasts = [...draft.ui.toasts.slice(-(MAX_TOASTS - 1)), toast];
      });

      return id;
    },

    dismissToast(id) {
      set((draft) => {
        draft.ui.toasts = draft.ui.toasts.filter((toast) => toast.id !== id);
      });
    },

    setSaveStatus(status) {
      set((draft) => {
        if (draft.ui.saveStatus !== status) {
          draft.ui.saveStatus = status;
        }
      });
    },
  };
}

import type { GameData } from '@/data';
import type { BuildState, EntryListKey, GearListKey } from '@/domain/build';
import type { SnapshotMeta, StorageAdapter } from '@/persistence';

export type Tab = 'character' | 'gear' | 'buffs' | 'results';

/** The selected entry per list (`null` = nothing selected). */
export type SelectedEntries = Record<EntryListKey, number | null>;

export interface ResultsView {
  baselineSwapId: number | null;
  onlyDiffering: boolean;
  highlightBest: boolean;
  showRawTotals: boolean;
  hiddenSwapIds: number[];
  collapsedGroups: string[];
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  details?: readonly string[];
}

export interface ConfirmDialog {
  kind: 'confirm';
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

export type DialogState =
  | { kind: 'share' }
  | { kind: 'import'; initialText: string }
  | { kind: 'snapshots' }
  | { kind: 'saveAs' }
  | ConfirmDialog
  | null;

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface UiState {
  gearCategory: GearListKey;
  selected: SelectedEntries;
  expandedSwapId: number | null;
  results: ResultsView;
  toasts: Toast[];
  dialog: DialogState;
  saveStatus: SaveStatus;
  snapshots: SnapshotMeta[];
}

export interface AppStoreDeps {
  readonly data: GameData;
  readonly storage: StorageAdapter;
  readonly now: () => number;
}

export interface AppState {
  build: BuildState;
  ui: UiState;
}

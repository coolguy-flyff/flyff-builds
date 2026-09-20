import type { GameData } from '@/data';
import type { BuildState, EntryListKey, GearListKey } from '@/domain/build';
import type { DamageTargetChoice, PartySkill } from '@/domain/engine';
import type { SnapshotMeta, StorageAdapter } from '@/persistence';

export type Tab = 'character' | 'gear' | 'buffs' | 'results';

/** The selected entry per list (`null` = nothing selected). */
export type SelectedEntries = Record<EntryListKey, number | null>;

/** `own`: each swap's own pet (no override); `none`: no pet at all; a number: that pet entry. */
export type PetOverride = 'own' | 'none' | number;

export interface ResultsView {
  baselineSwapId: number | null;
  onlyDiffering: boolean;
  highlightBest: boolean;
  showRawTotals: boolean;
  hiddenSwapIds: number[];
  collapsedGroups: string[];
  /** Composition/issue chips under the swap names in the results header. */
  showSwapDetails: boolean;
  /** Apply each swap's pet grace buff — a results-only what-if, not part of the build. */
  petGrace: boolean;
  /** What every swap wears instead of its own pet — a results-only what-if. */
  petOverride: PetOverride;
  /** The target of the damage rows (plan §1). */
  damageTarget: DamageTargetChoice;
  /** The party attack skill applied against the training dummy (a full party of 8 assumed). */
  partySkill: PartySkill;
  /** Damage skill family id → the master variation its row shows (the base when absent). */
  skillVariations: Record<number, number>;
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  details?: readonly string[];
}

/** An option the user can toggle before confirming, e.g. "Keep the current build as a snapshot". */
export interface ConfirmCheckbox {
  label: string;
  defaultChecked: boolean;
}

export interface ConfirmDialog {
  kind: 'confirm';
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  /** Receives the checkbox state (false when the dialog has no checkbox). */
  onConfirm: (checked: boolean) => void;
  checkbox?: ConfirmCheckbox;
}

export type DialogState =
  | { kind: 'share' }
  | { kind: 'import'; initialText: string }
  | { kind: 'snapshots' }
  | { kind: 'saveAs' }
  | { kind: 'pvpTargets' }
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

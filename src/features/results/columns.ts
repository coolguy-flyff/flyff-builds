import { getItem, type GameData } from '@/data';
import { issuesFor, type BuildState, type EntryListKey, type GearSwap } from '@/domain/build';
import type { SwapResult } from '@/domain/engine';
import type { ChipTone } from '@/components/Chip';
import { requireDefined } from '@/lib/assert';
import type { Selectors } from '@/state';

/**
 * One results column per included swap (plan A4.1): its display name, the composition chips for
 * the header's second line and every issue that affects the column (build validation on the swap
 * plus the degradations the engine applied while resolving it).
 */

export interface ResultsColumn {
  readonly swapId: number;
  readonly name: string;
  readonly composition: readonly string[];
  readonly issues: readonly string[];
  readonly result: SwapResult;
}

export interface ColumnChip {
  readonly label: string;
  readonly tone: ChipTone;
}

/** The slice of the store selectors the columns need; kept narrow so tests can stub it. */
export type ColumnNaming = Pick<Selectors, 'entryName' | 'issues'>;

function compositionOf(
  data: GameData,
  build: BuildState,
  naming: ColumnNaming,
  swap: GearSwap,
): string[] {
  const parts: string[] = [];

  const push = (list: EntryListKey, id: number | null): void => {
    if (id !== null) {
      parts.push(naming.entryName(build, list, id));
    }
  };

  push('equipmentSets', swap.equipmentSetId);
  push('weapons', swap.weaponId);

  if (swap.offhand !== null) {
    push(swap.offhand.kind === 'shield' ? 'shields' : 'weapons', swap.offhand.id);
  }

  push('accessorySets', swap.accessorySetId);
  push('fashionSets', swap.fashionSetId);
  push('pets', swap.petId);

  if (swap.maskItemId !== null) {
    parts.push(getItem(data, swap.maskItemId)?.name ?? `Mask #${swap.maskItemId}`);
  }

  push('statPages', swap.statPageId);

  return parts;
}

function issuesOf(
  build: BuildState,
  naming: ColumnNaming,
  swap: GearSwap,
  result: SwapResult,
): string[] {
  const messages = [
    ...issuesFor(naming.issues(build), 'gearSwaps', swap.id).map((issue) => issue.message),
    ...result.resolved.issues.map((issue) => issue.message),
  ];

  return [...new Set(messages)];
}

/** All included columns in swap order (hidden columns are filtered separately). */
export function buildColumns(
  data: GameData,
  build: BuildState,
  naming: ColumnNaming,
  results: readonly SwapResult[],
): ResultsColumn[] {
  const swaps = new Map(build.gearSwaps.map((swap) => [swap.id, swap]));

  return results.map((result) => {
    const swap = requireDefined(
      swaps.get(result.swapId),
      `Result for unknown swap ${result.swapId}`,
    );

    return {
      swapId: swap.id,
      name: naming.entryName(build, 'gearSwaps', swap.id),
      composition: compositionOf(data, build, naming, swap),
      issues: issuesOf(build, naming, swap, result),
      result,
    };
  });
}

export function visibleColumns(
  columns: readonly ResultsColumn[],
  hiddenSwapIds: readonly number[],
): ResultsColumn[] {
  const hidden = new Set(hiddenSwapIds);

  return columns.filter((column) => !hidden.has(column.swapId));
}

/** Composition chips followed by an amber chip per issue (plan D6). */
export function headerChips(column: ResultsColumn): ColumnChip[] {
  return [
    ...column.composition.map((label): ColumnChip => ({ label, tone: 'neutral' })),
    ...column.issues.map((message): ColumnChip => ({ label: `⚠ ${message}`, tone: 'warn' })),
  ];
}

/** Footnote lines for the degradations the engine applied to the visible columns (plan A4.3). */
export function engineFootnotes(columns: readonly ResultsColumn[]): string[] {
  return columns.flatMap((column) =>
    column.result.resolved.issues.map((issue) => `⚠ ${column.name}: ${issue.message}`),
  );
}

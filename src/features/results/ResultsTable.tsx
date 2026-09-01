import { Chip } from '@/components/Chip';
import { cx } from '@/lib/cx';
import { bestColumns, diffValue, rowValues } from '@/results/compare';
import { formatDiff, formatValue } from '@/results/format';
import type { ResultsRow, ResultsRowGroup, RowValue } from '@/results/rowCatalog';

import { headerChips, type ResultsColumn } from './columns';

export interface ResultsTableProps {
  groups: readonly ResultsRowGroup[];
  /** Visible columns only, in swap order. */
  columns: readonly ResultsColumn[];
  highlightBest: boolean;
  /** Column whose values every other column is diffed against; `null` = no diff mode. */
  baselineSwapId: number | null;
  collapsedGroups: readonly string[];
  onToggleGroup: (groupId: string) => void;
  onOpenSwap: (swapId: number) => void;
}

const STAT_COLUMN_WIDTH_PX = 200;
const SWAP_COLUMN_MIN_WIDTH_PX = 190;

const CELL = 'border-t border-white/5 px-3.5 py-1.5';
const STICKY_LEFT = 'sticky left-0 z-10';
const UPPERCASE_LABEL = 'font-sans text-[11px] font-semibold tracking-[0.07em] uppercase';

/** Sign of a diff for colouring: ranges by the sum of their bound deltas. */
function diffDirection(diff: RowValue): number {
  let direction = 0;

  if (typeof diff === 'number') {
    direction = Math.sign(diff);
  } else if (diff !== null) {
    direction = Math.sign(diff.min + diff.max);
  }

  return direction;
}

function diffToneClass(diff: RowValue, higherIsBetter: boolean): string {
  const direction = diffDirection(diff);
  let tone = 'text-dim';

  if (direction !== 0) {
    tone = direction > 0 === higherIsBetter ? 'text-ok' : 'text-danger';
  }

  return tone;
}

function issueSummary(count: number): string {
  return `${count} issue${count === 1 ? '' : 's'}`;
}

function ColumnHeader({
  column,
  onOpenSwap,
}: {
  column: ResultsColumn;
  onOpenSwap: (swapId: number) => void;
}) {
  return (
    <th scope="col" className="sticky top-0 z-10 bg-row px-3.5 py-2.5 text-left align-top">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title={`Open ${column.name} on the Buffs & Swaps tab`}
          onClick={() => {
            onOpenSwap(column.swapId);
          }}
          className="min-w-0 truncate font-sans text-[13px] font-semibold text-accent hover:underline"
        >
          {column.name}
        </button>
        {column.issues.length > 0 && (
          <span
            role="img"
            aria-label={issueSummary(column.issues.length)}
            title={column.issues.join('\n')}
            className="shrink-0 text-[13px] text-warn"
          >
            ⚠
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {headerChips(column).map((chip, index) => (
          <Chip
            key={`${index}:${chip.label}`}
            tone={chip.tone}
            title={chip.label}
            className="max-w-full overflow-hidden"
          >
            {chip.label}
          </Chip>
        ))}
      </div>
    </th>
  );
}

function GroupRow({
  group,
  columnCount,
  collapsed,
  onToggle,
}: {
  group: ResultsRowGroup['group'];
  columnCount: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tr>
      <th scope="rowgroup" className={cx(STICKY_LEFT, 'bg-card px-3.5 py-1.5 text-left')}>
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={onToggle}
          className={cx(UPPERCASE_LABEL, 'flex items-center gap-1.5 text-text-2 hover:text-text')}
        >
          <span aria-hidden="true" className="text-dim">
            {collapsed ? '▸' : '▾'}
          </span>
          {group.label}
        </button>
      </th>
      <td colSpan={columnCount} className="bg-card px-3.5 py-1.5 text-[11px] text-dim">
        {group.note !== undefined && <span>— {group.note}</span>}
      </td>
    </tr>
  );
}

function DataRow({
  row,
  columns,
  highlightBest,
  baselineIndex,
}: {
  row: ResultsRow;
  columns: readonly ResultsColumn[];
  highlightBest: boolean;
  baselineIndex: number | null;
}) {
  const values = rowValues(
    row,
    columns.map((column) => column.result.page),
  );
  const best = highlightBest ? bestColumns(values, row.higherIsBetter) : null;
  const baseline = baselineIndex === null ? null : (values[baselineIndex] ?? null);

  return (
    <tr>
      <th
        scope="row"
        title={row.tooltip}
        className={cx(CELL, STICKY_LEFT, 'bg-table text-left font-sans font-medium text-text-2')}
      >
        {row.label}
      </th>
      {columns.map((column, index) => {
        const value = values[index] ?? null;
        const isBest = best?.[index] === true;
        const showDiff = baselineIndex !== null && index !== baselineIndex;
        const diff = showDiff ? diffValue(value, baseline) : null;

        return (
          <td
            key={column.swapId}
            data-best={isBest ? 'true' : undefined}
            className={cx(
              CELL,
              'font-mono whitespace-nowrap',
              isBest ? 'bg-accent/7 text-accent' : 'text-text',
            )}
          >
            {formatValue(value, row.format)}
            {showDiff && (
              <span
                data-diff={formatDiff(diff, row.format)}
                className={cx('ml-1.5 text-[11px]', diffToneClass(diff, row.higherIsBetter))}
              >
                {formatDiff(diff, row.format)}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * The comparison table (plan A4.1 / D6): sticky stat column and header rows, collapsible groups,
 * best-value accents and per-cell diffs. Scrolls inside its own container, never the page.
 */
export function ResultsTable({
  groups,
  columns,
  highlightBest,
  baselineSwapId,
  collapsedGroups,
  onToggleGroup,
  onOpenSwap,
}: ResultsTableProps) {
  const baselineIndex = columns.findIndex((column) => column.swapId === baselineSwapId);
  const effectiveBaselineIndex = baselineIndex === -1 ? null : baselineIndex;

  return (
    <div className="max-h-[calc(100vh-220px)] overflow-auto rounded-xl bg-table">
      <table
        className="w-full table-fixed border-separate border-spacing-0 text-[12.5px]"
        style={{ minWidth: STAT_COLUMN_WIDTH_PX + columns.length * SWAP_COLUMN_MIN_WIDTH_PX }}
      >
        <colgroup>
          <col style={{ width: STAT_COLUMN_WIDTH_PX }} />
          {columns.map((column) => (
            <col key={column.swapId} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className={cx(
                UPPERCASE_LABEL,
                'sticky top-0 left-0 z-20 bg-row px-3.5 py-2.5 text-left align-top text-muted',
              )}
            >
              Stat
            </th>
            {columns.map((column) => (
              <ColumnHeader key={column.swapId} column={column} onOpenSwap={onOpenSwap} />
            ))}
          </tr>
        </thead>
        {groups.map(({ group, rows }) => {
          const collapsed = collapsedGroups.includes(group.id);

          return (
            <tbody key={group.id}>
              <GroupRow
                group={group}
                columnCount={columns.length}
                collapsed={collapsed}
                onToggle={() => {
                  onToggleGroup(group.id);
                }}
              />
              {!collapsed &&
                rows.map((row) => (
                  <DataRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    highlightBest={highlightBest}
                    baselineIndex={effectiveBaselineIndex}
                  />
                ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

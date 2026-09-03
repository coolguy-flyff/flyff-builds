import { Chip } from '@/components/Chip';
import { DragHandle, Sortable } from '@/components/Sortable';
import { FloatingTooltip, Tooltip, type TooltipPlacement } from '@/components/Tooltip';
import { useSortableItem } from '@/components/useSortableItem';
import { cx } from '@/lib/cx';
import { cellDetails } from '@/results/cellDetails';
import { bestColumns, diffValue, rowValues } from '@/results/compare';
import { formatDiff, formatValue } from '@/results/format';
import type { CellDetail, ResultsRow, ResultsRowGroup, RowValue } from '@/results/rowCatalog';

import { headerChips, type ResultsColumn } from './columns';

export interface ResultsTableProps {
  groups: readonly ResultsRowGroup[];
  /** Visible columns only, in swap order. */
  columns: readonly ResultsColumn[];
  highlightBest: boolean;
  /** Column whose values every other column is diffed against; `null` = no diff mode. */
  baselineSwapId: number | null;
  collapsedGroups: readonly string[];
  /** Composition/issue chips under each swap name; off by default. */
  showSwapDetails: boolean;
  onToggleGroup: (groupId: string) => void;
  onOpenSwap: (swapId: number) => void;
  /** Drag & drop: `swapId` takes `targetSwapId`'s column (the order is shared with Buffs & Swaps). */
  onMoveSwap: (swapId: number, targetSwapId: number) => void;
}

const STAT_COLUMN_WIDTH_PX = 200;
/** Fixed swap-column width: values stay close together instead of stretching across the page. */
const SWAP_COLUMN_WIDTH_PX = 229;

const CELL = 'border-t border-white/5 px-3.5 py-1.5';
const STICKY_LEFT = 'sticky left-0 z-10';
const UPPERCASE_LABEL = 'font-sans text-[11px] font-semibold tracking-[0.07em] uppercase';

/** Groups near the top of the scroll container open their tooltips downwards. */
const TOOLTIP_BELOW_GROUPS: ReadonlySet<string> = new Set(['base', 'vitals']);

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

function columnName(columns: readonly ResultsColumn[], swapId: number): string {
  return columns.find((column) => column.swapId === swapId)?.name ?? '';
}

/** Follows the pointer while a column header is dragged; the cells themselves stay put. */
function ColumnDragPreview({ name }: { name: string }) {
  return (
    <div className="rounded-control bg-control px-3 py-2 font-sans text-[13px] font-semibold text-accent shadow-lg">
      {name}
    </div>
  );
}

function ColumnHeader({
  column,
  showDetails,
  onOpenSwap,
}: {
  column: ResultsColumn;
  showDetails: boolean;
  onOpenSwap: (swapId: number) => void;
}) {
  const { attachNode, isDragging, isDropTarget, handle } = useSortableItem(
    column.swapId,
    column.name,
  );

  return (
    <th
      ref={attachNode}
      scope="col"
      className={cx(
        'sticky top-0 z-10 bg-row px-3.5 py-2.5 text-left align-top',
        isDragging && 'opacity-40',
        isDropTarget && 'outline-2 -outline-offset-2 outline-accent',
      )}
    >
      <div className="flex items-start gap-1.5">
        <DragHandle handle={handle} className="mt-px" />
        <button
          type="button"
          title={`Open ${column.name} on the Buffs & Swaps tab`}
          onClick={() => {
            onOpenSwap(column.swapId);
          }}
          className="line-clamp-2 min-w-0 flex-1 text-left font-sans text-[13px] leading-snug font-semibold break-words text-accent hover:underline"
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
      {showDetails && (
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
      )}
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

function DetailList({ lines }: { lines: readonly CellDetail[] }) {
  return (
    <dl className="flex flex-col gap-0.5">
      {lines.map((line) => (
        <div key={line.label} className="flex justify-between gap-4">
          <dt className="min-w-0 text-muted break-words">{line.label}</dt>
          <dd className="shrink-0 font-mono whitespace-nowrap text-text">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CellValue({
  text,
  details,
  placement,
}: {
  text: string;
  details: readonly CellDetail[];
  placement: TooltipPlacement;
}) {
  let content;

  if (details.length === 0) {
    content = <span>{text}</span>;
  } else {
    content = (
      <Tooltip placement={placement} content={<DetailList lines={details} />}>
        <span className="cursor-help underline decoration-white/20 decoration-dotted underline-offset-2">
          {text}
        </span>
      </Tooltip>
    );
  }

  return content;
}

function DataRow({
  row,
  columns,
  highlightBest,
  baselineIndex,
  tooltipPlacement,
}: {
  row: ResultsRow;
  columns: readonly ResultsColumn[];
  highlightBest: boolean;
  baselineIndex: number | null;
  tooltipPlacement: TooltipPlacement;
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
        className={cx(CELL, STICKY_LEFT, 'bg-table text-left font-sans font-medium text-text-2')}
      >
        {row.tooltip === undefined ? (
          row.label
        ) : (
          <FloatingTooltip content={row.tooltip}>
            <span className="cursor-help underline decoration-white/25 decoration-dotted underline-offset-4">
              {row.label}
            </span>
          </FloatingTooltip>
        )}
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
            <CellValue
              text={formatValue(value, row.format)}
              details={value === null ? [] : cellDetails(row, column.result)}
              placement={tooltipPlacement}
            />
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
 * best-value accents, per-cell diffs and factor/source tooltips. Fixed column widths — the table
 * shrink-wraps its columns and scrolls inside its own container, never the page. Column headers
 * drag to reorder the swaps.
 */
export function ResultsTable({
  groups,
  columns,
  highlightBest,
  baselineSwapId,
  collapsedGroups,
  showSwapDetails,
  onToggleGroup,
  onOpenSwap,
  onMoveSwap,
}: ResultsTableProps) {
  const baselineIndex = columns.findIndex((column) => column.swapId === baselineSwapId);
  const effectiveBaselineIndex = baselineIndex === -1 ? null : baselineIndex;

  return (
    <Sortable
      ids={columns.map((column) => column.swapId)}
      direction="horizontal"
      onMove={onMoveSwap}
      renderOverlay={(swapId) => <ColumnDragPreview name={columnName(columns, swapId)} />}
    >
      <div className="min-h-0 w-fit max-w-full flex-1 overflow-auto rounded-xl bg-table">
        <table
          className="table-fixed border-separate border-spacing-0 text-[12.5px]"
          style={{ width: STAT_COLUMN_WIDTH_PX + columns.length * SWAP_COLUMN_WIDTH_PX }}
        >
          <colgroup>
            <col style={{ width: STAT_COLUMN_WIDTH_PX }} />
            {columns.map((column) => (
              <col key={column.swapId} style={{ width: SWAP_COLUMN_WIDTH_PX }} />
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
                Swap
              </th>
              {columns.map((column) => (
                <ColumnHeader
                  key={column.swapId}
                  column={column}
                  showDetails={showSwapDetails}
                  onOpenSwap={onOpenSwap}
                />
              ))}
            </tr>
          </thead>
          {groups.map(({ group, rows }) => {
            const collapsed = collapsedGroups.includes(group.id);
            const placement: TooltipPlacement = TOOLTIP_BELOW_GROUPS.has(group.id)
              ? 'bottom'
              : 'top';

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
                      tooltipPlacement={placement}
                    />
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </Sortable>
  );
}

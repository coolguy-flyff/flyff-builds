import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Select } from '@/components/Select';
import { DragHandle, Sortable } from '@/components/Sortable';
import { FloatingTooltip, Tooltip, type TooltipPlacement } from '@/components/Tooltip';
import { useSortableItem } from '@/components/useSortableItem';
import {
  PARTY_MEMBERS,
  type DamageTarget,
  type DamageTargetChoice,
  type PartySkill,
} from '@/domain/engine';
import { cx } from '@/lib/cx';
import { cellDetails } from '@/results/cellDetails';
import { bestColumns, diffValue, rowValues } from '@/results/compare';
import { formatDiff, formatValue } from '@/results/format';
import type { CellDetail, ResultsRow, ResultsRowGroup, RowValue } from '@/results/rowCatalog';

import { headerChips, type ResultsColumn } from './columns';
import { TargetPicker } from './TargetPicker';

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
  /** A row with variants (a damage skill family) switched to another variation. */
  onSelectVariant: (key: string, value: string) => void;
  /** The damage rows' target: the picker sits in the Damage group's header row. */
  targets: readonly DamageTarget[];
  damageTarget: DamageTargetChoice;
  onSelectTarget: (choice: DamageTargetChoice) => void;
  /** Opens the PvP targets dialog (presets and the build's custom targets). */
  onEditTargets: () => void;
  /** The party attack skill against the training dummy; the select shows for the dummy only. */
  partySkill: PartySkill;
  onSelectPartySkill: (partySkill: PartySkill) => void;
}

const PARTY_SKILL_OPTIONS: readonly { value: PartySkill; label: string }[] = [
  { value: 'none', label: 'No party skill' },
  { value: 'linked', label: 'Linked Attack' },
  { value: 'global', label: 'Global Attack' },
];

function isPartySkill(value: string): value is PartySkill {
  return PARTY_SKILL_OPTIONS.some((option) => option.value === value);
}

const DAMAGE_GROUP_ID = 'damage';

const STAT_COLUMN_WIDTH_PX = 200;
/** Fixed swap-column width: values stay close together instead of stretching across the page. */
const SWAP_COLUMN_WIDTH_PX = 229;
/**
 * The table is never narrower than this many swap columns: one swap spans three widths, two
 * swaps a width and a half each.
 */
const MIN_SWAP_COLUMNS = 3;

function swapColumnWidth(columnCount: number): number {
  return (Math.max(columnCount, MIN_SWAP_COLUMNS) * SWAP_COLUMN_WIDTH_PX) / columnCount;
}

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
  control,
  onToggle,
}: {
  group: ResultsRowGroup['group'];
  columnCount: number;
  collapsed: boolean;
  /** Replaces the inline note (the Damage group's target picker). */
  control?: ReactNode;
  onToggle: () => void;
}) {
  let note: ReactNode = null;

  if (control !== undefined) {
    note = control;
  } else if (group.note !== undefined) {
    note = <span>— {group.note}</span>;
  }

  return (
    <tr>
      <th scope="rowgroup" className={cx(STICKY_LEFT, 'bg-card px-3.5 py-1.5 text-left')}>
        <span className="flex items-center gap-1.5">
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
          {group.tooltip !== undefined && (
            <FloatingTooltip content={group.tooltip}>
              <span aria-label={`About ${group.label}`} className="cursor-help text-dim">
                ⓘ
              </span>
            </FloatingTooltip>
          )}
        </span>
      </th>
      <td colSpan={columnCount} className="bg-card px-3.5 py-1 text-[11px] text-dim">
        {note}
      </td>
    </tr>
  );
}

/**
 * "— vs [Training dummy ▾] Targets… [No party skill ▾]" in the Damage group's header row; the
 * party skill select only shows against the dummy, since the skills only work on monsters.
 */
function TargetControl({
  targets,
  choice,
  onChange,
  onEdit,
  partySkill,
  onSelectPartySkill,
}: {
  targets: readonly DamageTarget[];
  choice: DamageTargetChoice;
  onChange: (choice: DamageTargetChoice) => void;
  onEdit: () => void;
  partySkill: PartySkill;
  onSelectPartySkill: (partySkill: PartySkill) => void;
}) {
  return (
    <span className="flex items-center gap-2 font-sans text-text-2">
      <span className="text-dim">— vs</span>
      <TargetPicker targets={targets} choice={choice} onChange={onChange} />
      <Button
        size="xs"
        variant="ghost"
        title="The PvP presets and your own targets"
        onClick={onEdit}
      >
        Targets…
      </Button>
      {choice.kind === 'dummy' && (
        <span className="w-[150px]">
          <Select
            label="Party skill"
            size="sm"
            title={`Party attack skill, with a full party of ${String(PARTY_MEMBERS)} assumed`}
            value={partySkill}
            options={PARTY_SKILL_OPTIONS}
            onChange={(value) => {
              if (isPartySkill(value)) {
                onSelectPartySkill(value);
              }
            }}
          />
        </span>
      )}
    </span>
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

const LABEL_UNDERLINE =
  'cursor-help underline decoration-white/25 decoration-dotted underline-offset-4';

/** The stat name; a select when the row offers variants, with the explanation on an info mark. */
function RowLabel({
  row,
  onSelectVariant,
}: {
  row: ResultsRow;
  onSelectVariant: (key: string, value: string) => void;
}) {
  let label;

  if (row.variants !== undefined) {
    const { key, value, ariaLabel, options, suffix } = row.variants;

    label = (
      <span className="flex items-center gap-1.5">
        <Select
          label={ariaLabel}
          size="sm"
          value={value}
          options={options.map((option) => ({ ...option, title: option.label }))}
          onChange={(next) => {
            onSelectVariant(key, next);
          }}
          className="min-w-0 flex-1"
        />
        {suffix !== undefined && <span className="shrink-0 font-mono text-muted">{suffix}</span>}
        {row.tooltip !== undefined && (
          <FloatingTooltip content={row.tooltip}>
            <span aria-label="About this row" className="shrink-0 cursor-help text-dim">
              ⓘ
            </span>
          </FloatingTooltip>
        )}
      </span>
    );
  } else if (row.tooltip === undefined) {
    label = row.label;
  } else {
    label = (
      <FloatingTooltip content={row.tooltip}>
        <span className={LABEL_UNDERLINE}>{row.label}</span>
      </FloatingTooltip>
    );
  }

  return label;
}

function DataRow({
  row,
  columns,
  highlightBest,
  baselineIndex,
  tooltipPlacement,
  onSelectVariant,
}: {
  row: ResultsRow;
  columns: readonly ResultsColumn[];
  highlightBest: boolean;
  baselineIndex: number | null;
  tooltipPlacement: TooltipPlacement;
  onSelectVariant: (key: string, value: string) => void;
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
        aria-label={row.variants === undefined ? undefined : row.label}
        className={cx(CELL, STICKY_LEFT, 'bg-table text-left font-sans font-medium text-text-2')}
      >
        <RowLabel row={row} onSelectVariant={onSelectVariant} />
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
 * shrink-wraps its columns and rows, and scrolls inside its own container (never the page) once
 * they outgrow it. Column headers drag to reorder the swaps.
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
  onSelectVariant,
  targets,
  damageTarget,
  onSelectTarget,
  onEditTargets,
  partySkill,
  onSelectPartySkill,
}: ResultsTableProps) {
  const baselineIndex = columns.findIndex((column) => column.swapId === baselineSwapId);
  const effectiveBaselineIndex = baselineIndex === -1 ? null : baselineIndex;
  const columnWidth = swapColumnWidth(columns.length);

  return (
    <Sortable
      ids={columns.map((column) => column.swapId)}
      direction="horizontal"
      onMove={onMoveSwap}
      renderOverlay={(swapId) => <ColumnDragPreview name={columnName(columns, swapId)} />}
    >
      <div className="min-h-0 w-fit max-w-full shrink overflow-auto rounded-xl bg-table">
        <table
          className="table-fixed border-separate border-spacing-0 text-[12.5px]"
          style={{ width: STAT_COLUMN_WIDTH_PX + columns.length * columnWidth }}
        >
          <colgroup>
            <col style={{ width: STAT_COLUMN_WIDTH_PX }} />
            {columns.map((column) => (
              <col key={column.swapId} style={{ width: columnWidth }} />
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
                  control={
                    group.id === DAMAGE_GROUP_ID ? (
                      <TargetControl
                        targets={targets}
                        choice={damageTarget}
                        onChange={onSelectTarget}
                        onEdit={onEditTargets}
                        partySkill={partySkill}
                        onSelectPartySkill={onSelectPartySkill}
                      />
                    ) : undefined
                  }
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
                      onSelectVariant={onSelectVariant}
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

import { CheckListPopover } from '@/components/CheckListPopover';
import { DropdownMenu } from '@/components/DropdownMenu';
import { Select, type SelectOption } from '@/components/Select';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import type { ExportFormat } from '@/results/export';
import type { ResultsView } from '@/state';

import { EXPORT_OPTIONS } from './exportActions';

export interface ToolbarColumn {
  readonly swapId: number;
  readonly name: string;
  readonly hidden: boolean;
}

export interface ResultsToolbarProps {
  view: ResultsView;
  /** Every included swap, hidden ones included (they are listed in the Swaps menu). */
  columns: readonly ToolbarColumn[];
  /** The baseline actually applied (a hidden baseline counts as none). */
  baselineSwapId: number | null;
  /** What the pet grace toggle applies (duration, cooldown, energy), for its tooltip. */
  petGraceHint: string;
  onViewChange: (patch: Partial<ResultsView>) => void;
  onColumnVisibility: (swapId: number, visible: boolean) => void;
  onExport: (format: ExportFormat) => void;
}

const NONE_VALUE = '';

function ToolbarToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-2">
      <Toggle checked={checked} onChange={onChange} label={label} />
      <span
        className="cursor-pointer select-none"
        onClick={() => {
          onChange(!checked);
        }}
      >
        {label}
      </span>
    </span>
  );
}

/** Diff / filter / highlight switches, column picker and export menu (plan A4.1, D6). */
export function ResultsToolbar({
  view,
  columns,
  baselineSwapId,
  petGraceHint,
  onViewChange,
  onColumnVisibility,
  onExport,
}: ResultsToolbarProps) {
  const baselineOptions: SelectOption[] = [
    { value: NONE_VALUE, label: '— none —' },
    ...columns
      .filter((column) => !column.hidden)
      .map((column) => ({ value: String(column.swapId), label: column.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-2 text-[12px] text-text-2">
        Diff vs
        <span className="w-[220px]">
          <Select
            label="Diff vs"
            size="sm"
            value={baselineSwapId === null ? NONE_VALUE : String(baselineSwapId)}
            options={baselineOptions}
            onChange={(value) => {
              onViewChange({ baselineSwapId: value === NONE_VALUE ? null : Number(value) });
            }}
          />
        </span>
      </span>
      <ToolbarToggle
        label="Only differing rows"
        checked={view.onlyDiffering}
        onChange={(checked) => {
          onViewChange({ onlyDiffering: checked });
        }}
      />
      <ToolbarToggle
        label="Highlight best"
        checked={view.highlightBest}
        onChange={(checked) => {
          onViewChange({ highlightBest: checked });
        }}
      />
      <ToolbarToggle
        label="Show raw totals"
        checked={view.showRawTotals}
        onChange={(checked) => {
          onViewChange({ showRawTotals: checked });
        }}
      />
      <ToolbarToggle
        label="Swap details"
        checked={view.showSwapDetails}
        onChange={(checked) => {
          onViewChange({ showSwapDetails: checked });
        }}
      />
      <Tooltip placement="bottom" content={petGraceHint}>
        <ToolbarToggle
          label="Pet grace"
          checked={view.petGrace}
          onChange={(checked) => {
            onViewChange({ petGrace: checked });
          }}
        />
      </Tooltip>
      <div className="ml-auto flex items-center gap-2">
        <CheckListPopover
          label="Swaps"
          title="Visible swaps"
          items={columns.map((column) => ({
            key: String(column.swapId),
            label: column.name,
            checked: !column.hidden,
          }))}
          onToggle={(key, checked) => {
            onColumnVisibility(Number(key), checked);
          }}
        />
        <DropdownMenu
          label="Export"
          items={EXPORT_OPTIONS.map((option) => ({
            key: option.format,
            label: option.label,
            onSelect: () => {
              onExport(option.format);
            },
          }))}
        />
      </div>
    </div>
  );
}

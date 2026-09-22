import { CheckListPopover } from '@/components/CheckListPopover';
import { DropdownMenu } from '@/components/DropdownMenu';
import { ItemIcon } from '@/components/ItemIcon';
import { Select, type SelectOption } from '@/components/Select';
import { ToolbarMenu, ToolbarMenuSection } from '@/components/ToolbarMenu';
import type { ExportFormat } from '@/results/export';
import type { ResultsView } from '@/state';

import { EXPORT_OPTIONS } from './exportActions';
import { PetMenu } from './PetMenu';
import type { PremiumQuickToggles } from './premiumQuickToggles';
import { PremsMenu } from './PremsMenu';
import { SwitchLabel } from './SwitchLabel';
import { petOverrideLabel, type OverridePet } from './viewState';

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
  /** The build's pet entries, offered as an override for every swap. */
  pets: readonly OverridePet[];
  /** What the pet grace toggle applies (duration, cooldown, energy), for its tooltip. */
  petGraceHint: string;
  /** The premium favorites as switches on the build's premium items. */
  premium: PremiumQuickToggles;
  onViewChange: (patch: Partial<ResultsView>) => void;
  onColumnVisibility: (swapId: number, visible: boolean) => void;
  onExport: (format: ExportFormat) => void;
}

const NONE_VALUE = '';

type TableViewKey = 'onlyDiffering' | 'highlightBest' | 'showRawTotals' | 'showSwapDetails';

/** Settings that only change how the table reads, never a number in it. */
const TABLE_VIEW_SWITCHES: readonly { key: TableViewKey; label: string }[] = [
  { key: 'onlyDiffering', label: 'Only differing rows' },
  { key: 'highlightBest', label: 'Highlight best' },
  { key: 'showRawTotals', label: 'Show raw totals' },
  { key: 'showSwapDetails', label: 'Swap details' },
];

function ViewMenu({
  view,
  onViewChange,
}: {
  view: ResultsView;
  onViewChange: (patch: Partial<ResultsView>) => void;
}) {
  const count = TABLE_VIEW_SWITCHES.filter(({ key }) => view[key]).length;

  return (
    <ToolbarMenu label="View" count={count} anchor="bottom end" panelClassName="w-[220px]">
      <ToolbarMenuSection title="Table view">
        <div className="flex flex-col gap-2.5">
          {TABLE_VIEW_SWITCHES.map(({ key, label }) => (
            <SwitchLabel
              key={key}
              label={label}
              checked={view[key]}
              onChange={(checked) => {
                onViewChange({ [key]: checked });
              }}
            />
          ))}
        </div>
      </ToolbarMenuSection>
    </ToolbarMenu>
  );
}

/** "Computed with  Pet: Tiger S ✕" — the Results-only pet override, cleared by its ✕. */
function PetOverridePill({
  label,
  icon,
  onClear,
}: {
  label: string;
  icon: string | null;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-dim">Computed with</span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pr-1.5 pl-3 text-[11.5px] font-medium text-accent">
        {icon !== null && <ItemIcon icon={icon} size={14} />}
        Pet: {label}
        <button
          type="button"
          aria-label="Clear pet override"
          onClick={onClear}
          className="grid h-4 w-4 place-items-center rounded-full bg-accent/18 text-[9px] hover:bg-accent/30"
        >
          ✕
        </button>
      </span>
    </div>
  );
}

/**
 * Results toolbar (plan A4.1, D6; after mockup 6b): Diff vs and the Pet / Prems menus (what
 * changes the numbers) on the left, the View / Swaps / Export menus on the right, and a pill under
 * them while the pet override is on.
 */
export function ResultsToolbar({
  view,
  columns,
  baselineSwapId,
  pets,
  petGraceHint,
  premium,
  onViewChange,
  onColumnVisibility,
  onExport,
}: ResultsToolbarProps) {
  const baselineOptions: SelectOption[] = [
    { value: NONE_VALUE, label: '— none —' },
    ...columns
      .filter((column) => !column.hidden)
      .map((column) => ({ value: String(column.swapId), label: column.name, title: column.name })),
  ];
  // The control truncates long swap names; the native tooltip reveals the full one on hover.
  const baselineTitle = columns.find((column) => column.swapId === baselineSwapId)?.name;
  const petLabel = petOverrideLabel(view.petOverride, pets);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-2 text-[12px] text-text-2">
          Diff vs
          <span className="w-[170px]">
            <Select
              label="Diff vs"
              size="sm"
              title={baselineTitle}
              value={baselineSwapId === null ? NONE_VALUE : String(baselineSwapId)}
              options={baselineOptions}
              onChange={(value) => {
                onViewChange({ baselineSwapId: value === NONE_VALUE ? null : Number(value) });
              }}
            />
          </span>
        </span>
        <PetMenu
          petOverride={view.petOverride}
          petGrace={view.petGrace}
          pets={pets}
          petGraceHint={petGraceHint}
          onPetOverride={(petOverride) => {
            onViewChange({ petOverride });
          }}
          onPetGrace={(petGrace) => {
            onViewChange({ petGrace });
          }}
        />
        <PremsMenu premium={premium} />
        <div className="ml-auto flex items-center gap-2">
          <ViewMenu view={view} onViewChange={onViewChange} />
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
      {petLabel !== undefined && (
        <PetOverridePill
          label={petLabel}
          icon={pets.find((pet) => pet.id === view.petOverride)?.icon ?? null}
          onClear={() => {
            onViewChange({ petOverride: 'own' });
          }}
        />
      )}
    </div>
  );
}

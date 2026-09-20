import { useId } from 'react';

import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import { Select, type SelectGroup, type SelectOption } from '@/components/Select';
import { SnapSlider } from '@/components/SnapSlider';
import { Stepper } from '@/components/Stepper';
import { FieldLabel, Hint } from '@/components/Text';
import {
  PVP_TARGET_BOUNDS,
  PVP_TARGET_PRESETS,
  type PvpTargetPreset,
  type PvpTargetStatKey,
  type PvpTargetStats,
  type StatBounds,
} from '@/config/pvpTargets';
import { LIMITS, type PvpTarget } from '@/domain/build';
import { damageTargetKey, type DamageTargetChoice } from '@/domain/engine';
import { requireDefined } from '@/lib/assert';
import { formatPercent } from '@/results/format';
import { useActions, useAppStore, useBuild } from '@/state';

/**
 * "PvP targets" (plan §9): the defender the Damage rows hit in PvP, as six character-window
 * numbers. Built-in presets are read-only; any target can be duplicated into a custom one, which
 * lives in the build (persisted and shared with it) and is edited here in place. The dialog's
 * selection is the results view's pick, so closing it shows the target just edited.
 */

interface Field {
  readonly key: PvpTargetStatKey;
  readonly label: string;
}

interface PercentField extends Field {
  /** Whether the stat strengthens as it goes negative, so its slider runs from 0 downwards. */
  readonly descending: boolean;
}

const FLAT_FIELDS: readonly Field[] = [
  { key: 'defense', label: 'Defense' },
  { key: 'magicDefense', label: 'Magic defense' },
];

const PERCENT_FIELDS: readonly PercentField[] = [
  { key: 'magicResistance', label: 'Magic resistance', descending: false },
  { key: 'criticalResist', label: 'Crit resist', descending: false },
  { key: 'pvpDamageReduction', label: 'PvP damage reduction', descending: false },
  { key: 'incomingDamage', label: 'Incoming damage', descending: true },
];

const COPY_SUFFIX = ' copy';
const PRESETS_GROUP = 'Presets';
const CUSTOM_GROUP = 'Custom';

function integerRange(bounds: StatBounds): number[] {
  const values: number[] = [];

  for (let value = bounds.min; value <= bounds.max; value += 1) {
    values.push(value);
  }

  return values;
}

/**
 * Slider stops of each percentage: whole percents across the game's caps, weakest first, so every
 * knob moves right into more of the effect (incoming damage reads 0 → −50).
 */
const PERCENT_OPTIONS: ReadonlyMap<PvpTargetStatKey, readonly number[]> = new Map(
  PERCENT_FIELDS.map((field) => {
    const stops = integerRange(PVP_TARGET_BOUNDS[field.key]);

    return [field.key, field.descending ? stops.reverse() : stops];
  }),
);

/** What the dialog shows: a preset (read-only) or a custom target of the build. */
interface Editable {
  readonly choice: DamageTargetChoice;
  readonly name: string;
  readonly stats: PvpTargetStats;
  readonly custom: PvpTarget | null;
}

function presetEditable(preset: PvpTargetPreset): Editable {
  return {
    choice: { kind: 'preset', id: preset.id },
    name: preset.name,
    stats: preset,
    custom: null,
  };
}

function customEditable(target: PvpTarget): Editable {
  return {
    choice: { kind: 'custom', id: target.id },
    name: target.name,
    stats: target,
    custom: target,
  };
}

/** The results view's pick when it is a PvP target, else the first preset. */
function resolveEditable(
  choice: DamageTargetChoice,
  customTargets: readonly PvpTarget[],
): Editable {
  let editable: Editable | undefined;

  if (choice.kind === 'preset') {
    const preset = PVP_TARGET_PRESETS.find((candidate) => candidate.id === choice.id);

    editable = preset === undefined ? undefined : presetEditable(preset);
  } else if (choice.kind === 'custom') {
    const target = customTargets.find((candidate) => candidate.id === choice.id);

    editable = target === undefined ? undefined : customEditable(target);
  }

  return editable ?? presetEditable(requireDefined(PVP_TARGET_PRESETS[0], 'no PvP presets'));
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[11.5px] text-muted">{label}</span>
      {children}
    </div>
  );
}

export function PvpTargetsDialog({ onClose }: { onClose: () => void }) {
  const build = useBuild();
  const actions = useActions();
  const choice = useAppStore((state) => state.ui.results.damageTarget);
  const selectId = useId();
  const nameId = useId();
  const editable = resolveEditable(choice, build.pvpTargets);
  const readOnly = editable.custom === null;
  const full = build.pvpTargets.length >= LIMITS.pvpTargets;
  const choices = new Map<string, DamageTargetChoice>();

  const optionOf = (targetChoice: DamageTargetChoice, label: string): SelectOption => {
    const key = damageTargetKey(targetChoice);

    choices.set(key, targetChoice);

    return { value: key, label };
  };

  const presetOptions = PVP_TARGET_PRESETS.map((preset) =>
    optionOf({ kind: 'preset', id: preset.id }, preset.name),
  );
  const customOptions = build.pvpTargets.map((target) =>
    optionOf({ kind: 'custom', id: target.id }, target.name),
  );
  const groups: SelectGroup[] = [{ label: PRESETS_GROUP, options: presetOptions }];

  if (customOptions.length > 0) {
    groups.push({ label: CUSTOM_GROUP, options: customOptions });
  }

  const pick = (key: string): void => {
    const next = choices.get(key);

    if (next !== undefined) {
      actions.updateResultsView({ damageTarget: next });
    }
  };

  const duplicate = (): void => {
    actions.addPvpTarget(`${editable.name}${COPY_SUFFIX}`, editable.stats);
  };

  const remove = (): void => {
    if (editable.custom !== null) {
      actions.removePvpTarget(editable.custom.id);
    }
  };

  const update = (patch: Partial<Omit<PvpTarget, 'id'>>): void => {
    if (editable.custom !== null) {
      actions.updatePvpTarget(editable.custom.id, patch);
    }
  };

  const updateStat = (key: PvpTargetStatKey, value: number): void => {
    const patch: Partial<Record<PvpTargetStatKey, number>> = {};

    patch[key] = value;
    update(patch);
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="PvP targets"
      description="The defender the Damage rows hit in PvP, as six character-window numbers. Presets are geared players by role; duplicate one to enter a specific opponent’s numbers."
      width="lg"
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <FieldLabel htmlFor={selectId} className="mb-1.5">
            Target
          </FieldLabel>
          <Select
            id={selectId}
            label="PvP target"
            value={damageTargetKey(editable.choice)}
            groups={groups}
            onChange={pick}
          />
        </div>
        <Button variant="soft" disabled={full} onClick={duplicate}>
          Duplicate
        </Button>
        {!readOnly && (
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        )}
      </div>
      {full && (
        <Hint tone="warn" className="mt-1.5">
          A build holds at most {LIMITS.pvpTargets} custom targets; delete one to duplicate again.
        </Hint>
      )}
      <div className="mt-4">
        {readOnly ? (
          <Hint tone="muted">
            Built-in presets cannot be edited — duplicate one to enter your own numbers.
          </Hint>
        ) : (
          <>
            <FieldLabel htmlFor={nameId} className="mb-1.5">
              Name
            </FieldLabel>
            <input
              id={nameId}
              type="text"
              value={editable.name}
              maxLength={LIMITS.nameLength}
              onChange={(event) => {
                update({ name: event.currentTarget.value });
              }}
              className="w-full rounded-control bg-control px-3 py-2 text-[13px] text-text outline-none"
            />
          </>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {FLAT_FIELDS.map((field) => (
          <FieldBox key={field.key} label={field.label}>
            <Stepper
              size="compact"
              label={field.label}
              value={editable.stats[field.key]}
              min={PVP_TARGET_BOUNDS[field.key].min}
              max={PVP_TARGET_BOUNDS[field.key].max}
              disabled={readOnly}
              onChange={(value) => {
                updateStat(field.key, value);
              }}
            />
          </FieldBox>
        ))}
        {PERCENT_FIELDS.map((field) => (
          <FieldBox key={field.key} label={field.label}>
            <SnapSlider
              label={field.label}
              options={requireDefined(PERCENT_OPTIONS.get(field.key), field.key)}
              value={editable.stats[field.key]}
              format={formatPercent}
              disabled={readOnly}
              onChange={(value) => {
                updateStat(field.key, value);
              }}
            />
          </FieldBox>
        ))}
      </div>
      <Hint className="mt-3">
        Defense as the damage formula reads it (the level/STA term plus a quarter of the armor
        defense the character window adds in full), magic defense as the window shows it, both
        before the game’s PvP factor; percentages as the target’s own totals. The picked target
        applies to every swap’s Damage rows.
      </Hint>
      <DialogActions>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </AppDialog>
  );
}

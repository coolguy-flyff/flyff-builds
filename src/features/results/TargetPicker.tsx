import { useState } from 'react';

import { Select, type SelectGroup, type SelectOption } from '@/components/Select';
import { Tooltip } from '@/components/Tooltip';
import { damageTargetKey, type DamageTarget, type DamageTargetChoice } from '@/domain/engine';
import { requireDefined } from '@/lib/assert';
import { formatInt, formatPercent } from '@/results/format';

/**
 * The target of the damage rows (plan §1, §9), shown in the Damage group's header row: the
 * Training dummy at the character's level, the built-in PvP presets, then the build's custom
 * targets; the numbers of the chosen target are in its tooltip.
 */

const GROUP_LABELS = { preset: 'Presets', custom: 'Custom' } as const;

function keyOf(target: DamageTarget): string {
  return damageTargetKey(target.choice);
}

function targetOption(target: DamageTarget): SelectOption {
  return { value: keyOf(target), label: target.name };
}

function groupOf(targets: readonly DamageTarget[], kind: keyof typeof GROUP_LABELS): SelectGroup[] {
  const options = targets.filter((target) => target.choice.kind === kind).map(targetOption);

  return options.length === 0 ? [] : [{ label: GROUP_LABELS[kind], options }];
}

/** The numbers of a target, for the tooltip on the picker. */
function TargetStats({ target }: { target: DamageTarget }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dl className="flex flex-col gap-0.5">
        {target.stats.map((stat) => (
          <div key={stat.label} className="flex justify-between gap-4">
            <dt className="text-muted">{stat.label}</dt>
            <dd className="font-mono text-text">
              {stat.rate ? formatPercent(stat.value) : formatInt(stat.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface TooltipVisibility {
  readonly visible: boolean;
  /** Hide the tooltip after a pick, until the pointer comes back or the focus leaves. */
  readonly dismiss: () => void;
  readonly handlers: {
    readonly onMouseEnter: () => void;
    readonly onMouseLeave: () => void;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
    readonly onPointerDown: () => void;
    readonly onKeyDown: () => void;
  };
}

/**
 * Whether the stats tooltip shows. The pure CSS hover/focus rules cannot decide this on their own:
 * a mouse pick leaves the select focused and, in Chrome, in `:focus-visible`, and closing the
 * native popup fires a mouse-leave, so a CSS tooltip would pin open after every pick. Here the
 * tooltip follows the pointer, follows the focus only when the keyboard put it there, and hides
 * after a pick until the pointer comes back or the focus leaves.
 */
function useTooltipVisibility(): TooltipVisibility {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [focusedByKeyboard, setFocusedByKeyboard] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  return {
    visible: !dismissed && (hovered || (focused && focusedByKeyboard)),
    dismiss: () => {
      setDismissed(true);
    },
    handlers: {
      onMouseEnter: () => {
        setHovered(true);
        setDismissed(false);
      },
      onMouseLeave: () => {
        setHovered(false);
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        setFocused(false);
        setDismissed(false);
      },
      onPointerDown: () => {
        setFocusedByKeyboard(false);
      },
      onKeyDown: () => {
        setFocusedByKeyboard(true);
      },
    },
  };
}

export function TargetPicker({
  targets,
  choice,
  onChange,
}: {
  /** The dummy first; a choice nothing here answers to shows as the dummy, as the engine does. */
  targets: readonly DamageTarget[];
  choice: DamageTargetChoice;
  onChange: (choice: DamageTargetChoice) => void;
}) {
  const tooltip = useTooltipVisibility();
  const chosenKey = damageTargetKey(choice);
  const selected =
    targets.find((target) => keyOf(target) === chosenKey) ??
    requireDefined(targets[0], 'no damage targets');
  const dummies = targets.filter((target) => target.choice.kind === 'dummy');
  const groups: SelectGroup[] = [...groupOf(targets, 'preset'), ...groupOf(targets, 'custom')];

  return (
    <Tooltip placement="top" content={tooltip.visible ? <TargetStats target={selected} /> : null}>
      <span className="w-[210px]" {...tooltip.handlers}>
        <Select
          label="Target"
          size="sm"
          value={keyOf(selected)}
          options={dummies.map(targetOption)}
          groups={groups}
          onChange={(value) => {
            const target = targets.find((candidate) => keyOf(candidate) === value);

            if (target !== undefined) {
              tooltip.dismiss();
              onChange(target.choice);
            }
          }}
        />
      </span>
    </Tooltip>
  );
}

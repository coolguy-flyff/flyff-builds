import type { ReactNode } from 'react';

import { Stepper } from '@/components/Stepper';

import { formatUpgrade } from '../format';

/** What a piece with a single tier (Meteor, Meteofy) shows instead of an upgrade. */
const NO_UPGRADE = '—';

/**
 * One accessory piece (plan A2.4): label, a compact upgrade stepper (aligned across rows) over the
 * piece's own range — 0…10 on a set piece, the tiers of a CW jewel — the optional variant control
 * and the piece's resolved abilities at that upgrade.
 */
export function PieceUpgradeRow({
  label,
  control,
  upgrade,
  min,
  max,
  onUpgrade,
  abilities,
}: {
  label: string;
  control?: ReactNode | undefined;
  upgrade: number;
  min: number;
  max: number;
  onUpgrade: (upgrade: number) => void;
  abilities: string;
}) {
  const fixed = min === max;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[70px] shrink-0 text-[12px] text-text-2">{label}</span>
      <Stepper
        size="compact"
        label={`${label} upgrade`}
        value={upgrade}
        min={min}
        max={max}
        format={fixed ? () => NO_UPGRADE : formatUpgrade}
        disabled={fixed}
        onChange={onUpgrade}
      />
      {control}
      <span
        className="ml-auto min-w-0 truncate text-right font-mono text-[11px] text-muted"
        title={abilities}
      >
        {abilities}
      </span>
    </div>
  );
}

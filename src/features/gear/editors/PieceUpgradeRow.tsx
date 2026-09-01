import type { ReactNode } from 'react';

import { MAX_UPGRADE_LEVEL } from '@/domain/build';
import { Stepper } from '@/components/Stepper';

import { formatUpgrade } from '../format';

/**
 * One accessory piece (plan A2.4): label, a compact upgrade stepper (aligned across rows), the
 * optional variant control and the piece's resolved abilities at that upgrade.
 */
export function PieceUpgradeRow({
  label,
  control,
  upgrade,
  onUpgrade,
  abilities,
}: {
  label: string;
  control?: ReactNode | undefined;
  upgrade: number;
  onUpgrade: (upgrade: number) => void;
  abilities: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[70px] shrink-0 text-[12px] text-text-2">{label}</span>
      <Stepper
        size="compact"
        label={`${label} upgrade`}
        value={upgrade}
        min={0}
        max={MAX_UPGRADE_LEVEL}
        format={formatUpgrade}
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

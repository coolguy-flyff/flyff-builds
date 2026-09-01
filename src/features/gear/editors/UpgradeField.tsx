import type { ReactNode } from 'react';

import { MAX_UPGRADE_LEVEL } from '@/domain/build';
import { SubCard } from '@/components/Card';
import { Stepper } from '@/components/Stepper';
import { Hint, type HintTone } from '@/components/Text';

import { formatUpgrade, UPGRADE_QUICK_PICKS } from '../format';

/** Upgrade sub-card (plan A2.1 / A2.2): 0–10 stepper with quick picks and a read-only hint line. */
export function UpgradeField({
  label = 'Upgrade',
  note,
  value,
  onChange,
  hint,
  hintTone,
}: {
  label?: string | undefined;
  note?: ReactNode | undefined;
  value: number;
  onChange: (upgrade: number) => void;
  hint?: ReactNode | undefined;
  hintTone?: HintTone | undefined;
}) {
  return (
    <SubCard label={label} note={note}>
      <Stepper
        label={`${label} level`}
        value={value}
        min={0}
        max={MAX_UPGRADE_LEVEL}
        quickPicks={UPGRADE_QUICK_PICKS}
        format={formatUpgrade}
        onChange={onChange}
      />
      {hint !== undefined && (
        <Hint className="mt-2" tone={hintTone}>
          {hint}
        </Hint>
      )}
    </SubCard>
  );
}

import type { ReactNode } from 'react';

import type { Rarity } from '@/data';
import { cx } from '@/lib/cx';

import { rarityClassName } from './rarity';

export function RarityText({
  rarity,
  children,
  className,
}: {
  rarity: Rarity;
  children: ReactNode;
  className?: string | undefined;
}) {
  return <span className={cx(rarityClassName(rarity), className)}>{children}</span>;
}

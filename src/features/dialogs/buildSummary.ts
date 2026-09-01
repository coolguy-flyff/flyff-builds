import type { BuildState } from '@/domain/build';
import { pluralize } from '@/features/snapshots/format';

interface CountPart {
  readonly count: number;
  readonly noun: string;
  /** Shown even when zero (stat pages and swaps always exist in a valid build). */
  readonly always?: boolean;
}

/** Import preview counts (plan A0.2): `3 stat pages · 2 sets · 3 weapons · 4 swaps`; zero counts are omitted. */
export function describeBuildCounts(build: BuildState): string {
  const parts: readonly CountPart[] = [
    { count: build.statPages.length, noun: 'stat page', always: true },
    { count: build.equipmentSets.length, noun: 'set' },
    { count: build.weapons.length, noun: 'weapon' },
    { count: build.shields.length, noun: 'shield' },
    { count: build.accessorySets.length, noun: 'accessory set' },
    { count: build.fashionSets.length, noun: 'fashion set' },
    { count: build.pets.length, noun: 'pet' },
    { count: build.gearSwaps.length, noun: 'swap', always: true },
  ];

  return parts
    .filter((part) => part.always === true || part.count > 0)
    .map((part) => pluralize(part.count, part.noun))
    .join(' · ');
}

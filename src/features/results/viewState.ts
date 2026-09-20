import type { BuildState } from '@/domain/build';
import type { PetOverride } from '@/state';

/** Small pure helpers over the results view state (`ui.results`). */

/**
 * The build the results are computed from: with a pet override, every swap wears that pet entry
 * (or none). The build itself is returned untouched (same reference) without an override or when
 * the pet entry no longer exists.
 */
export function withPetOverride(build: BuildState, petOverride: PetOverride): BuildState {
  let petId: number | null | undefined;

  if (petOverride === 'none') {
    petId = null;
  } else if (petOverride !== 'own' && build.pets.some((pet) => pet.id === petOverride)) {
    petId = petOverride;
  }

  let effective = build;

  if (petId !== undefined) {
    const overridden = petId;

    effective = {
      ...build,
      gearSwaps: build.gearSwaps.map((swap) => ({ ...swap, petId: overridden })),
    };
  }

  return effective;
}

/** The list with `value` added (at the end) or removed, never duplicated. */
export function setMembership<T>(list: readonly T[], value: T, present: boolean): T[] {
  const without = list.filter((item) => item !== value);

  return present ? [...without, value] : without;
}

export function toggleMembership<T>(list: readonly T[], value: T): T[] {
  return setMembership(list, value, !list.includes(value));
}

/** The variation choices with `familyId` now showing `skillId`. */
export function withSkillVariation(
  skillVariations: Readonly<Record<number, number>>,
  familyId: number,
  skillId: number,
): Record<number, number> {
  return { ...skillVariations, [familyId]: skillId };
}

/** A stored baseline only applies while its column is visible; otherwise diff mode is off. */
export function effectiveBaseline(
  baselineSwapId: number | null,
  visibleSwapIds: readonly number[],
): number | null {
  let baseline: number | null = null;

  if (baselineSwapId !== null && visibleSwapIds.includes(baselineSwapId)) {
    baseline = baselineSwapId;
  }

  return baseline;
}

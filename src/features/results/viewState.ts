import type { BuildState } from '@/domain/build';
import type { PetOverride } from '@/state';

/** Small pure helpers over the results view state (`ui.results`). */

/** A pet entry as the pet override offers it. */
export interface OverridePet {
  readonly id: number;
  /** The entry's own name, else the species ("Tiger"). */
  readonly name: string;
  /** The cage's item icon; null while the entry has no pet chosen. */
  readonly icon: string | null;
  /** "STA +20"; null while the entry has no pet chosen. */
  readonly stat: string | null;
  /** What its grace grants at its raised level ("STR +10 · …"); null for a pet without one. */
  readonly graceEffect: string | null;
}

/** The pet select's values: the two keywords as themselves, a pet entry by its id. */
export const OWN_PET_VALUE = 'own';
export const NO_PET_VALUE = 'none';

export function parsePetOverride(value: string): PetOverride {
  let override: PetOverride;

  if (value === OWN_PET_VALUE || value === NO_PET_VALUE) {
    override = value;
  } else {
    override = Number(value);
  }

  return override;
}

/** Whether the override replaces the swaps' own pets (an override of a deleted pet does not). */
export function isPetOverrideActive(
  petOverride: PetOverride,
  pets: readonly OverridePet[],
): boolean {
  return petOverride === 'none' || pets.some((pet) => pet.id === petOverride);
}

/** What pet grace would add under the current pet override. */
export type GraceEffect =
  /** Each swap keeps its own pet, so each gets its own grace. */
  | { readonly kind: 'varies' }
  /** No pet, or a pet without a grace: the switch has nothing to apply. */
  | { readonly kind: 'none' }
  | { readonly kind: 'effect'; readonly text: string };

export function graceEffectFor(
  petOverride: PetOverride,
  pets: readonly OverridePet[],
): GraceEffect {
  let effect: GraceEffect = { kind: 'varies' };

  if (petOverride === 'none') {
    effect = { kind: 'none' };
  } else if (petOverride !== 'own') {
    const pet = pets.find((candidate) => candidate.id === petOverride);

    if (pet !== undefined) {
      effect =
        pet.graceEffect === null ? { kind: 'none' } : { kind: 'effect', text: pet.graceEffect };
    }
  }

  return effect;
}

/** "Tiger S" for a pet entry, "none" for no pet; undefined while each swap keeps its own. */
export function petOverrideLabel(
  petOverride: PetOverride,
  pets: readonly OverridePet[],
): string | undefined {
  let label: string | undefined;

  if (petOverride === 'none') {
    label = 'none';
  } else if (petOverride !== 'own') {
    label = pets.find((pet) => pet.id === petOverride)?.name;
  }

  return label;
}

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

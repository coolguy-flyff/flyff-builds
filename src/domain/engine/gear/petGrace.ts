import type { Ability, GameData } from '@/data';

import type { PetEntry } from '../../build/schema';
import { petTierBreakdown } from '../../rules/pets';
import { abilityContributions, createSink, origin, type Collected } from '../abilities/collect';
import { memoizeByDataAndEntry } from './entryMemo';

/** The grace buff a pet casts, at the level its raised tiers unlock. */
export interface PetGraceApplied {
  readonly name: string;
  readonly level: number;
  readonly abilities: readonly Ability[];
}

export interface PetGraceResolution extends Collected {
  readonly grace: PetGraceApplied | null;
}

/**
 * Pet grace (plan feedback 2026-09-03, item 3): the grace level equals the number of raised tiers
 * (skilltree.jsx:309-330), read off the representative tier breakdown of the pet's total. Unknown
 * pets are reported by the pet resolver; here they simply cast nothing.
 */
function collectPetGrace(data: GameData, entry: PetEntry): PetGraceResolution {
  const sink = createSink();
  const def = data.pets.find((candidate) => candidate.petItemId === entry.petItemId);
  const grace = def?.grace;
  let applied: PetGraceApplied | null = null;

  if (def !== undefined && grace !== undefined) {
    const raisedTiers = petTierBreakdown(def, entry.total)?.length ?? 0;
    const level = Math.min(raisedTiers, grace.levels.length);
    const abilities = grace.levels[level - 1];

    if (abilities !== undefined) {
      applied = { name: grace.name, level, abilities };
      sink.contributions.push(
        ...abilityContributions(
          abilities,
          origin('petGrace', `${grace.name} Lv ${level}`, { skillId: grace.skillId }),
        ),
      );
    }
  }

  return { grace: applied, contributions: sink.contributions, issues: sink.issues };
}

export const resolvePetGrace = memoizeByDataAndEntry(collectPetGrace);

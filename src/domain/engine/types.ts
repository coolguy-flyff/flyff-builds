import type { SlimClass, SlimItem } from '@/data';

import type { StatPage } from '../build/schema';
import type { Contribution } from './abilities/types';
import type { PetGraceApplied } from './gear/petGrace';
import type { EngineIssue } from './issues';

export interface EquippedItem {
  readonly item: SlimItem;
  readonly upgrade: number;
}

export interface ResolvedOffhand extends EquippedItem {
  readonly kind: 'shield' | 'weapon';
}

/**
 * A gear swap resolved against the game data: everything the results page needs, with every stat
 * source flattened into {@link Contribution}s (plan B7.1).
 */
export interface ResolvedCharacter {
  readonly job: SlimClass;
  readonly level: number;
  readonly statPage: StatPage;
  readonly contributions: readonly Contribution[];
  /** The bare-hands weapon when the swap has no weapon. */
  readonly mainhand: SlimItem;
  readonly mainhandUpgrade: number;
  readonly offhand: ResolvedOffhand | null;
  /** Helmet, suit, gauntlets, boots and — when equipped — the shield (category `armor`). */
  readonly armorPieces: readonly EquippedItem[];
  /** Lowest upgrade across the four armor pieces; 0 without a full set. */
  readonly armorSetUpgradeLevel: number;
  readonly hasUpcutStone: boolean;
  /** The pet's grace buff when the results view applies it and the swap has a pet. */
  readonly petGrace: PetGraceApplied | null;
  readonly issues: readonly EngineIssue[];
}

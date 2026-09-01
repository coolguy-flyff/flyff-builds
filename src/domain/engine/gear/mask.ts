import type { GameData } from '@/data';

import { createSink, type Collected } from '../abilities/collect';
import { collectItemAbilities, resolveItemId } from './itemSlot';

/** The mask is picked per swap (no entry list); it is a plain item with abilities. */
export function collectMask(data: GameData, maskItemId: number | null): Collected {
  const sink = createSink();
  const mask = resolveItemId(data, sink, maskItemId, 'Mask');

  if (mask !== null) {
    collectItemAbilities(sink, mask, 'mask', []);
  }

  return { contributions: sink.contributions, issues: sink.issues };
}

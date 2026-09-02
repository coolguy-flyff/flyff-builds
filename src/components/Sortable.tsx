import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, type ReactNode } from 'react';

import { cx } from '@/lib/cx';

import type { DragHandleProps } from './useSortableItem';

export type SortableDirection = 'horizontal' | 'vertical';

export interface SortableProps {
  /** Ids of the sortable items, in display order. */
  ids: readonly number[];
  direction: SortableDirection;
  /** Fires on drop: `id` takes the position `targetId` currently holds. */
  onMove: (id: number, targetId: number) => void;
  /**
   * Rendered under the pointer while `id` is being dragged. Without it the item itself follows
   * the pointer through `SortableItem.shiftStyle`.
   */
  renderOverlay?: ((id: number) => ReactNode) | undefined;
  children: ReactNode;
}

const STRATEGIES = {
  horizontal: horizontalListSortingStrategy,
  vertical: verticalListSortingStrategy,
} as const;

/** Keeps a drag on the list's axis (what @dnd-kit/modifiers offers, without another package). */
const AXIS_MODIFIERS: Record<SortableDirection, Modifier> = {
  horizontal: ({ transform }) => ({ ...transform, y: 0 }),
  vertical: ({ transform }) => ({ ...transform, x: 0 }),
};

/** A pointer travels this far before a drag starts, so plain clicks on a handle stay clicks. */
const DRAG_START_DISTANCE_PX = 4;

/**
 * Drag & drop reordering with the pointer, touch or keyboard (Space picks up, arrows move, Space
 * drops, Esc cancels). Wrap the list once; every item calls `useSortableItem` and renders a
 * {@link DragHandle}.
 */
export function Sortable({ ids, direction, onMove, renderOverlay, children }: SortableProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (event: DragStartEvent): void => {
    setActiveId(Number(event.active.id));
  };

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    setActiveId(null);

    if (over !== null && over.id !== active.id) {
      onMove(Number(active.id), Number(over.id));
    }
  };

  const onDragCancel = (): void => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[AXIS_MODIFIERS[direction]]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={[...ids]} strategy={STRATEGIES[direction]}>
        {children}
      </SortableContext>
      {renderOverlay !== undefined && (
        <DragOverlay>{activeId === null ? null : renderOverlay(activeId)}</DragOverlay>
      )}
    </DndContext>
  );
}

/** The grip that starts a drag; also the keyboard target (Space, arrows, Space). */
export function DragHandle({
  handle: { attach, label, attributes, listeners },
  className,
}: {
  handle: DragHandleProps;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      ref={attach}
      aria-label={label}
      {...attributes}
      {...listeners}
      className={cx(
        'shrink-0 cursor-grab touch-none rounded px-0.5 text-[14px] leading-none text-dim transition-colors select-none hover:text-text focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing',
        className,
      )}
    >
      <span aria-hidden="true">⠿</span>
    </button>
  );
}

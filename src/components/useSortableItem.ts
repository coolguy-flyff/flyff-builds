import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  /** Ref callback for the grip element. */
  attach: (element: HTMLElement | null) => void;
  label: string;
}

export interface SortableItem {
  /** Ref callback for the element that is dragged and that other items are dropped onto. */
  attachNode: (element: HTMLElement | null) => void;
  /** Slides the item with the pointer or out of the way; apply it where the item may move freely. */
  shiftStyle: CSSProperties;
  isDragging: boolean;
  /** Another item is held over this one and would take its position when dropped. */
  isDropTarget: boolean;
  handle: DragHandleProps;
}

/** One item of a `Sortable` list: where to attach the node and the grip, and its drag state. */
export function useSortableItem(id: number, label: string): SortableItem {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  return {
    attachNode: setNodeRef,
    shiftStyle: { transform: CSS.Translate.toString(transform), transition },
    isDragging,
    isDropTarget: isOver && !isDragging,
    handle: {
      attributes,
      listeners,
      attach: setActivatorNodeRef,
      label: `Drag to reorder ${label}`,
    },
  };
}

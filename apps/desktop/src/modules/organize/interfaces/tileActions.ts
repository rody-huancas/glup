import type { PointerEvent } from 'react';
import type { SelectMode } from '@/modules/organize/types/selectMode';
import type { TurnDirection } from '@/modules/organize/types/turnDirection';

// What a page tile can do; each one gets the page it belongs to.
export interface TileActions {
  onSelect        : (page: number, mode: SelectMode) => void;
  onRotate        : (page: number, direction: TurnDirection) => void;
  onRemove        : (page: number) => void;
  onRestore       : (page: number) => void;
  onPointerDown   : (page: number, event: PointerEvent<HTMLElement>) => void;
  onPointerMove   : (event: PointerEvent<HTMLElement>) => void;
  onPointerUp     : (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel : (event: PointerEvent<HTMLElement>) => void;
  // False right after a drag, so that click does not change the selection.
  takeClick       : () => boolean;
  registerTile    : (page: number) => (element: HTMLElement | null) => void;
}

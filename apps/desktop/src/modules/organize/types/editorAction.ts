import type { TurnDirection } from '@/modules/organize/types/turnDirection';

// `pages` are original page numbers. `to` is where the moved pages land: the index in the current
// order before which they are inserted (pages.length puts them at the end).
export type EditorAction =
  | { type: 'rotate'; pages: number[]; direction: TurnDirection }
  | { type: 'remove'; pages: number[] }
  | { type: 'restore'; pages: number[] }
  | { type: 'move'; pages: number[]; to: number }
  | { type: 'undo' }
  | { type: 'redo' };

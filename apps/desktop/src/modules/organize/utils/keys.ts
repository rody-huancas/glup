import type { KeyCommand } from '@/modules/organize/types/keyCommand';

interface KeyPress {
  key      : string;
  ctrlKey  : boolean;
  metaKey  : boolean;
  shiftKey : boolean;
}

interface MoveTargetParams {
  order : number[];
  pages : number[];
  step  : number;
}

const ARROW_STEPS: Record<string, (columns: number) => number> = {
  ArrowLeft  : () => -1,
  ArrowRight : () => 1,
  ArrowUp    : (columns) => -columns,
  ArrowDown  : (columns) => columns,
};

// Arrows move around, Ctrl+arrows move the chosen pages, Supr removes, Ctrl+Z / Ctrl+Y undo and redo.
export const readKey = (press: KeyPress, columns: number): KeyCommand | null => {
  const ctrl  = press.ctrlKey || press.metaKey;
  const arrow = ARROW_STEPS[press.key];
  const key   = press.key.toLowerCase();

  if (arrow) return { type: ctrl ? 'move' : 'focus', step: arrow(columns) };
  if (press.key === 'Delete') return { type: 'remove' };
  if (press.key === 'Escape') return { type: 'escape' };
  if (!ctrl) return null;
  if (key === 'z') return { type: press.shiftKey ? 'redo' : 'undo' };
  if (key === 'y') return { type: 'redo' };
  if (key === 'a') return { type: 'select-all' };
  return null;
};

// Where Ctrl+arrows put the chosen pages: `step` places before the first one or after the last one.
export const moveTarget = ({ order, pages, step }: MoveTargetParams): number => {
  const indexes = pages.map((page) => order.indexOf(page)).filter((index) => index >= 0);
  if (indexes.length === 0 || step === 0) return -1;

  const first = Math.min(...indexes);
  const last  = Math.max(...indexes);
  return step < 0 ? Math.max(0, first + step) : Math.min(order.length, last + 1 + step);
};

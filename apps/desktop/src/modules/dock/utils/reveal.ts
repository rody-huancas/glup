import { DEFAULT_REVEAL_DELAY, REVEAL_DELAYS } from '@/modules/dock/constants/dock';
import type { TaskbarState } from '@/modules/dock/interfaces/taskbarState';
import type { DockEdge } from '@/modules/dock/types/dockEdge';

// The delay saved, or the default; never shorter or longer than the choices of Ajustes.
export const revealDelay = (saved: number | null): number => {
  if (saved === null || !Number.isFinite(saved)) return DEFAULT_REVEAL_DELAY;
  return Math.min(Math.max(saved, REVEAL_DELAYS[0]), REVEAL_DELAYS[REVEAL_DELAYS.length - 1]);
};

// The edges a dock touches: a corner touches two.
const touched = (edge: DockEdge): string[] => edge.split('-');

// A taskbar that hides by itself comes out when the cursor rests against its edge, as a hidden Glup on
// that edge (or a corner of it) does: both would compete.
export const competesWithTaskbar = (edge: DockEdge, taskbar: TaskbarState | null): boolean =>
  Boolean(taskbar?.autohide && taskbar.edge && touched(edge).includes(taskbar.edge));

import type { IslandMachine } from '@/modules/island/interfaces/islandMachine';
import type { IslandPhase } from '@/modules/island/types/islandPhase';

// Asked to open (the cursor resting on the pill, a click on it) and still closed after this long: the
// island is not answering, and the watchdog brings it back to a clean pill.
export const UNRESPONSIVE_MS = 6000;

// How many checks in a row "being dragged" may disagree with Rust (no drag going) before it is let go.
export const STUCK_DRAG_CHECKS = 2;

const CLOSED: IslandPhase[] = ['collapsed', 'notice'];

// The cursor rests on the closed pill asking it to open (not just closed under it, not being dragged).
// The bubble opens with a click only, and a click is counted apart.
export const askedToOpen = (machine: IslandMachine): boolean =>
  CLOSED.includes(machine.phase) && machine.rest === 'pill' && machine.inside && !machine.locked && !machine.moving;

interface UnresponsiveParams {
  askedAt  : number | null;
  now      : number;
  phase    : IslandPhase;
  // Rust follows a drag right now (a real one keeps it closed on purpose).
  dragging : boolean;
}

// It was asked to open long ago and is still closed.
export const isUnresponsive = ({ askedAt, now, phase, dragging }: UnresponsiveParams): boolean =>
  askedAt !== null && !dragging && CLOSED.includes(phase) && now - askedAt >= UNRESPONSIVE_MS;

// The webview thinks the pill is being dragged but Rust follows no drag: the drop was lost.
export const isStuckDrag = (machine: IslandMachine, dragging: boolean): boolean => machine.moving && !dragging;

import type { DockEdge } from '@/modules/dock/types/dockEdge';

// One spot of the drawing of Ajustes: its dock and where it sits (shares of the drawing's size).
export interface DockSpot {
  edge : DockEdge;
  x    : number;
  y    : number;
}

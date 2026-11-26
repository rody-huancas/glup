import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import { sameSpot } from '@/modules/dock/utils/bubble';
import { sameDock } from '@/modules/dock/utils/snapDock';

// Any change of Ajustes (even one that is not the place, as Historial marking itself seen) reads the
// dock again as a new object; keeping the old one when it is the same keeps the placement too, so the
// island is not drawn again (an open panel would fade out and in).
export const keepDock = (current: IslandDock | null, next: IslandDock | null): IslandDock | null =>
  current && next && sameDock(current, next) ? current : next;

export const keepSpot = (current: BubbleSpot | null, next: BubbleSpot | null): BubbleSpot | null =>
  current && next && sameSpot(current, next) ? current : next;

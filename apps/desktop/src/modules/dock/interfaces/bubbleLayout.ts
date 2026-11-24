import type { Direction } from '@/modules/dock/types/direction';
import type { Point } from '@/shared/interfaces/point';

// The bubble in its window (the whole work area of its screen): its middle, and where what grows from it
// goes (the panel and the notice), toward the room there is.
export interface BubbleLayout {
  center : Point;
  grow   : { x: Direction; y: Direction };
}

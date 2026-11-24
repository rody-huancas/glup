import { BUBBLE } from '@/modules/dock/constants/dock';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import { bubbleCenter } from '@/modules/dock/utils/bubble';
import { pillBody } from '@/modules/dock/utils/dockLayout';
import { placeIsland } from '@/modules/dock/utils/placement';
import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

// The pill on the drawing of Ajustes, as shares (0 to 1) of the screen's work area.
export const pillOnScreen = (dock: IslandDock, work: Size): Rect => {
  const placement = placeIsland({ dock, work });
  const body      = pillBody(placement);

  return {
    x      : (placement.frame.x + body.x) / work.width,
    y      : (placement.frame.y + body.y) / work.height,
    width  : body.width / work.width,
    height : body.height / work.height,
  };
};

// The bubble on the drawing, as shares of the work area (a circle there).
export const bubbleOnScreen = (spot: BubbleSpot, work: Size): Rect => {
  const center = bubbleCenter(spot, work);
  const half   = BUBBLE.size / 2;

  return {
    x      : (center.x - half) / work.width,
    y      : (center.y - half) / work.height,
    width  : BUBBLE.size / work.width,
    height : BUBBLE.size / work.height,
  };
};

// A spot of the drawing (shares of its size) in CSS pixels of the work area it stands for.
export const drawingPoint = (share: { x: number; y: number }, work: Size) => ({ x: share.x * work.width, y: share.y * work.height });

import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
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

// A spot of the drawing (shares of its size) in CSS pixels of the work area it stands for.
export const drawingPoint = (share: { x: number; y: number }, work: Size) => ({ x: share.x * work.width, y: share.y * work.height });

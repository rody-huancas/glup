import type { IslandShape, ShapeSize } from '@/modules/island/interfaces/islandShape';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export const ISLAND_SHAPES: Record<VisibleIslandState, IslandShape> = {
  collapsed : { width: 148, height: 32, earRadius: 12, bottomRadius: 14 },
  // collapsed : { width: 120, height: 24, earRadius: 10, bottomRadius: 12 },
  expanded  : { width: 1040, height: 640, earRadius: 18, bottomRadius: 26 },
};

export const HOVER_SHAPE: ShapeSize = { width: 160, height: 36 };
// export const HOVER_SHAPE: ShapeSize = { width: 132, height: 28 };

// Peak of the small shake when the pill lands after closing.
export const SETTLE_SHAPE: ShapeSize = { width: 155, height: 29 };
// export const SETTLE_SHAPE: ShapeSize = { width: 126, height: 22 };

// About 0.9 of the collapsed pill.
export const ANTICIPATION_SHAPE: ShapeSize = { width: 133, height: 29 };
// export const ANTICIPATION_SHAPE: ShapeSize = { width: 108, height: 20 };

// Window size: room for the elastic overshoot (peak about 1173x703 with ears) plus a small margin. Must match tauri.conf.json.
export const ISLAND_FRAME: ShapeSize = { width: 1200, height: 720 };
// export const ISLAND_FRAME: ShapeSize = { width: 1280, height: 780 };

// Drawn at twice the width because the silhouette clips its outer half, leaving 1 px.
export const OUTLINE_WIDTH = 2;

import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { MascotCues } from '@/modules/island/interfaces/islandMascot';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { NoticeStyle } from '@/modules/island/types/noticeStyle';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export interface IslandTimelineParams {
  elements       : IslandElements;
  // Where the island is docked: its shapes, and the way the panel opens (toward the middle).
  placement      : IslandPlacement;
  target         : VisibleIslandState;
  reduced        : boolean;
  shape          : IslandShape;
  cues           : MascotCues;
  // Closed on purpose (Recoger, Esc): Glup waves goodbye before flying back.
  farewell       : boolean;
  onRender       : () => void;
  onShapeSettled : () => void;
}

export interface IslandPoseParams {
  elements  : IslandElements;
  placement : IslandPlacement;
  shape     : IslandShape;
  onRender  : () => void;
}

export interface NoticeTimelineParams extends IslandPoseParams {
  style : NoticeStyle;
}

export interface HoverTweenParams {
  placement : IslandPlacement;
  shape     : IslandShape;
  inflated  : boolean;
  onRender  : () => void;
}

export interface IslandMotion {
  builtFor : VisibleIslandState;
  target   : VisibleIslandState;
  farewell : boolean;
  timeline : gsap.core.Timeline | null;
}

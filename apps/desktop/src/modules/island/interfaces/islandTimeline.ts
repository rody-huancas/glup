import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { MascotCues } from '@/modules/island/interfaces/islandMascot';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export interface IslandTimelineParams {
  elements       : IslandElements;
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
  elements : IslandElements;
  shape    : IslandShape;
  onRender : () => void;
}

export interface HoverTweenParams {
  shape    : IslandShape;
  inflated : boolean;
  onRender : () => void;
}

export interface IslandMotion {
  builtFor : VisibleIslandState;
  target   : VisibleIslandState;
  farewell : boolean;
  timeline : gsap.core.Timeline | null;
}

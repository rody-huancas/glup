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
  timeline : gsap.core.Timeline | null;
}

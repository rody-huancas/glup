import type { VisibleIslandState } from '@/modules/island/types/islandState';

export interface WindowSize {
  width  : number;
  height : number;
}

export interface IslandSize extends WindowSize {
  radius: number;
}

export interface MascotPose {
  x     : number;
  y     : number;
  scale : number;
}

export interface Insets {
  top    : number;
  right  : number;
  bottom : number;
  left   : number;
}

export interface IslandLayout {
  target : VisibleIslandState;
  size   : IslandSize;
  pose   : MascotPose;
}

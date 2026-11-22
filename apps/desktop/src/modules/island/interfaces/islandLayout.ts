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

export interface IslandLayout {
  target : VisibleIslandState;
  size   : IslandSize;
}

export interface IslandColors {
  background : string;
  border     : string;
}

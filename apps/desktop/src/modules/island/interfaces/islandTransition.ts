import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { VisibleIslandState } from '@/modules/island/types/islandState';

export type IslandTransition = Record<keyof IslandElements, KeyframeAnimationOptions>;

export interface IslandPoseParams {
  elements : IslandElements;
  target   : VisibleIslandState;
}

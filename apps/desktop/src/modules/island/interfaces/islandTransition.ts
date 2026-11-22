import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandLayout } from '@/modules/island/interfaces/islandLayout';

export type IslandTransition = Record<keyof IslandElements, KeyframeAnimationOptions>;

export interface IslandPoseParams {
  elements : IslandElements;
  layout   : IslandLayout;
}

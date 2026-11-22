import { ISLAND_TRANSITIONS } from '@/modules/island/constants/island';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandLayout } from '@/modules/island/interfaces/islandLayout';
import type { IslandPoseParams } from '@/modules/island/interfaces/islandTransition';
import {
  getActionsKeyframe,
  getDropZoneKeyframe,
  getMascotKeyframe,
  getPanelKeyframe,
} from '@/modules/island/utils/islandStyles';

interface AnimateToParams {
  element  : HTMLElement | null;
  keyframe : Keyframe;
  options  : KeyframeAnimationOptions;
}

const KEYFRAME_BUILDERS: Record<keyof IslandElements, (layout: IslandLayout) => Keyframe> = {
  panel    : getPanelKeyframe,
  mascot   : getMascotKeyframe,
  dropZone : getDropZoneKeyframe,
  actions  : getActionsKeyframe,
};

const ELEMENT_KEYS = Object.keys(KEYFRAME_BUILDERS) as (keyof IslandElements)[];

// Animates from the current computed style and commits the result as inline style.
const animateTo = ({ element, keyframe, options }: AnimateToParams): Promise<void> => {
  if (!element) return Promise.resolve();

  const animation = element.animate([keyframe], { ...options, fill: 'forwards' });

  return animation.finished
    .then(() => {
      animation.commitStyles();
      animation.cancel();
    })
    .catch(() => undefined);
};

export const animateIsland = async ({ elements, layout }: IslandPoseParams): Promise<void> => {
  const transition = ISLAND_TRANSITIONS[layout.target];

  await Promise.all(
    ELEMENT_KEYS.map((key) =>
      animateTo({
        element  : elements[key].current,
        keyframe : KEYFRAME_BUILDERS[key](layout),
        options  : transition[key],
      }),
    ),
  );
};

export const applyIslandPose = ({ elements, layout }: IslandPoseParams) => {
  ELEMENT_KEYS.forEach((key) => {
    const element = elements[key].current;
    if (!element) return;

    element.getAnimations().forEach((animation) => animation.cancel());
    Object.assign(element.style, KEYFRAME_BUILDERS[key](layout));
  });
};

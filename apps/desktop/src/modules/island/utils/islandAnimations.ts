import { ISLAND_TRANSITIONS } from '@/modules/island/constants/island';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandPoseParams } from '@/modules/island/interfaces/islandTransition';
import type { VisibleIslandState } from '@/modules/island/types/islandState';
import { getDropZoneKeyframe, getMascotKeyframe, getPanelKeyframe } from '@/modules/island/utils/islandStyles';

interface AnimateToParams {
  element  : HTMLElement | null;
  keyframe : Keyframe;
  options  : KeyframeAnimationOptions;
}

const KEYFRAME_BUILDERS: Record<keyof IslandElements, (target: VisibleIslandState) => Keyframe> = {
  panel    : getPanelKeyframe,
  mascot   : getMascotKeyframe,
  dropZone : getDropZoneKeyframe,
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

export const animateIsland = async ({ elements, target }: IslandPoseParams): Promise<void> => {
  const transition = ISLAND_TRANSITIONS[target];

  await Promise.all(
    ELEMENT_KEYS.map((key) =>
      animateTo({
        element  : elements[key].current,
        keyframe : KEYFRAME_BUILDERS[key](target),
        options  : transition[key],
      }),
    ),
  );
};

export const applyIslandPose = ({ elements, target }: IslandPoseParams) => {
  ELEMENT_KEYS.forEach((key) => {
    const element = elements[key].current;
    if (!element) return;

    element.getAnimations().forEach((animation) => animation.cancel());
    Object.assign(element.style, KEYFRAME_BUILDERS[key](target));
  });
};

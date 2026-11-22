import {
  ALERT,
  BOUNCE_EASING,
  CONFUSED,
  EATING,
  HAPPY,
  WORKING,
} from '@/modules/mascot/constants/animation';
import type { StateRunner } from '@/modules/mascot/interfaces/stateRunner';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';
import {
  buildFlightKeyframes,
  buildSwallowKeyframes,
  getCenterOffset,
} from '@/modules/mascot/utils/eatingKeyframes';

const bounceOptions: KeyframeAnimationOptions = {
  duration : ALERT.duration,
  easing   : BOUNCE_EASING,
  fill     : 'forwards',
};

const scaleKeyframes = (scale: number): Keyframe[] => [
  { transform: 'scale(1)' },
  { transform: `scale(${scale})` },
];

const runIdle: StateRunner = async ({ setFace }) => {
  setFace({ mouth: 'smile', eyes: 'open' });
};

const runAlert: StateRunner = async ({ scope, elements, setFace }) => {
  setFace({ mouth: 'o', eyes: 'open' });

  scope.animate({ element: elements.act.current, keyframes: ALERT.keyframes, options: bounceOptions });

  [elements.eyeLeft.wrapper, elements.eyeRight.wrapper].forEach((eye) => {
    scope.animate({ element: eye.current, keyframes: scaleKeyframes(ALERT.eyeScale), options: bounceOptions });
  });
};

const runEating: StateRunner = async ({ state, scope, elements, setFace, finish }) => {
  if (state.type !== 'eating') return;

  const file  = elements.files[state.kind].current;
  const mouth = elements.mouths.open.current;
  const act   = elements.act.current;

  if (!file || !mouth || !act) return finish();

  setFace({ mouth: 'o', eyes: 'open' });

  const offset = getCenterOffset(file, mouth);
  const flight = scope.animate({
    element   : file,
    keyframes : buildFlightKeyframes({ offset, bounds: act.getBoundingClientRect() }),
    options   : { duration: EATING.flightDuration, easing: EATING.flightEasing, fill: 'forwards' },
  });

  await scope.wait(EATING.flightDuration / 2);
  setFace({ mouth: 'open', eyes: 'open' });
  await scope.finished(flight);

  const swallow = scope.animate({
    element   : file,
    keyframes : buildSwallowKeyframes(offset),
    options   : { duration: EATING.swallowDuration, easing: 'ease-in', fill: 'forwards' },
  });

  await scope.finished(swallow);
  setFace({ mouth: 'line', eyes: 'open' });

  const chew = scope.animate({
    element   : act,
    keyframes : EATING.chewKeyframes,
    options   : { duration: EATING.chewDuration, easing: 'ease-in-out' },
  });

  await scope.finished(chew);
  setFace({ mouth: 'smile', eyes: 'happy' });
  await scope.wait(EATING.happyTime);
  finish();
};

const runWorking: StateRunner = async ({ scope, elements, setFace }) => {
  setFace({ mouth: 'line', eyes: 'open' });

  scope.animate({
    element   : elements.act.current,
    keyframes : WORKING.keyframes,
    options   : { duration: WORKING.duration, easing: 'ease-in-out', direction: 'alternate', iterations: Infinity },
  });
};

const runHappy: StateRunner = async ({ scope, elements, setFace, finish }) => {
  setFace({ mouth: 'open', eyes: 'happy' });

  const jumps = scope.animate({
    element   : elements.act.current,
    keyframes : HAPPY.keyframes,
    options   : { duration: HAPPY.duration, easing: 'ease-in-out', iterations: HAPPY.jumps },
  });

  await scope.finished(jumps);
  finish();
};

const runConfused: StateRunner = async ({ scope, elements, setFace, finish }) => {
  setFace({ mouth: 'wavy', eyes: 'open' });

  const options: KeyframeAnimationOptions = { ...bounceOptions, duration: CONFUSED.duration };

  scope.animate({ element: elements.act.current, keyframes: CONFUSED.keyframes, options });
  scope.animate({
    element   : elements.eyeRight.wrapper.current,
    keyframes : scaleKeyframes(CONFUSED.rightEyeScale),
    options,
  });

  await scope.wait(CONFUSED.holdTime);
  finish();
};

export const STATE_RUNNERS: Record<MascotStateType, StateRunner> = {
  idle     : runIdle,
  alert    : runAlert,
  eating   : runEating,
  working  : runWorking,
  happy    : runHappy,
  confused : runConfused,
};

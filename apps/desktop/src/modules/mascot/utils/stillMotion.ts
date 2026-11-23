// Reduced motion: an animation of Glup's body becomes its pose, held still for the same time. The state
// keeps its face and its length (happy still lasts its jumps, confused its scratch), only nothing moves.

// What makes a frame move in time, not part of the pose itself.
const TIMING_KEYS = ['offset', 'easing', 'composite'];

const holdsEnd = (fill: KeyframeAnimationOptions['fill']): boolean => fill === 'forwards' || fill === 'both';

// The pose to show: where the animation stays when it keeps its end (the tilt of confused, the big eyes
// of alert); otherwise the rest it comes back to (between the jumps of happy, the sway of working).
export const stillKeyframes = (keyframes: Keyframe[], options: KeyframeAnimationOptions): Keyframe[] => {
  const pose  = (holdsEnd(options.fill) ? keyframes[keyframes.length - 1] : keyframes[0]) ?? {};
  const still = Object.fromEntries(Object.entries(pose).filter(([key]) => !TIMING_KEYS.includes(key))) as Keyframe;

  return [still, still];
};

// The same timing (delay, duration, repeats, fill) without the easing or the back and forth.
export const stillOptions = ({ duration, iterations, delay, fill }: KeyframeAnimationOptions): KeyframeAnimationOptions => ({
  duration,
  iterations,
  delay,
  fill,
});

import gsap from 'gsap';

interface OvershootParams {
  ease     : string;
  duration : number;
  change   : number;
}

const SAMPLES   = 1000;
const TOLERANCE = 0.5;

// Seconds until an ease stops passing its target by more than half a pixel, for a change of `change` px.
export const getOvershootEnd = ({ ease, duration, change }: OvershootParams): number => {
  const curve = gsap.parseEase(ease);
  let last    = 0;

  for (let step = 0; step <= SAMPLES; step += 1) {
    const progress = step / SAMPLES;
    if ((curve(progress) - 1) * change > TOLERANCE) last = Math.min((step + 1) / SAMPLES, 1);
  }

  return last * duration;
};

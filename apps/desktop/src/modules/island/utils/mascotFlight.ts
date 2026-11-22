import { MASCOT_MOTION } from '@/modules/island/constants/islandMascot';

interface FlightFlourishParams {
  timeline : gsap.core.Timeline;
  lift     : HTMLElement;
  squash   : HTMLElement;
  at       : number;
  duration : number;
}

// While Flip carries Glup, it rises a little before dropping onto the avatar and tilts -8° → 6° → 0°.
export const addFlightFlourish = ({ timeline, lift, squash, at, duration }: FlightFlourishParams): gsap.core.Timeline => {
  const { arc, tilt } = MASCOT_MOTION;
  const rise          = duration * arc.rise;
  const lean          = duration * tilt.lean;
  const swing         = duration * tilt.swing;

  return timeline
    .to(lift, { y: -arc.height, duration: rise, ease: arc.riseEase }, at)
    .to(lift, { y: 0, duration: duration - rise, ease: arc.fallEase }, at + rise)
    .to(squash, { rotation: tilt.from, duration: lean, ease: tilt.ease }, at)
    .to(squash, { rotation: tilt.to, duration: swing, ease: tilt.ease }, at + lean)
    .to(squash, { rotation: 0, duration: duration - lean - swing, ease: tilt.ease }, at + lean + swing);
};

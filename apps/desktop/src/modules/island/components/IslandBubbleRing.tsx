import { BUBBLE } from '@/modules/dock/constants/dock';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getBubbleRingStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandBubbleRingProps {
  visible   : boolean;
  // 0 to 1, or null while the task cannot tell how far it is (an arc goes around; with reduced motion
  // the whole ring stays, softer).
  fraction  : number | null;
  placement : IslandPlacement;
}

const { radius, thickness } = BUBBLE.ring;
const SIDE                  = (radius + thickness / 2) * 2;
const LENGTH                = 2 * Math.PI * radius;
const ARC                   = LENGTH * 0.25;

// A thin mint ring around the bubble while a task runs, filling from the top as it goes.
export const IslandBubbleRing = ({ visible, fraction, placement }: IslandBubbleRingProps) => {
  const known = fraction !== null;
  const shown = known ? LENGTH * Math.min(Math.max(fraction, 0), 1) : ARC;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SIDE} ${SIDE}`}
      className={cx('pointer-events-none absolute -rotate-90 transition-opacity duration-200 motion-reduce:transition-none', visible ? 'opacity-100' : 'opacity-0')}
      style={getBubbleRingStyle(placement)}
    >
      <circle cx={SIDE / 2} cy={SIDE / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-line" />
      <g className={cx(!known && 'origin-center animate-spin [animation-duration:1.2s] motion-reduce:animate-none')}>
        <circle
          cx={SIDE / 2}
          cy={SIDE / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${shown} ${LENGTH}`}
          className={cx('stroke-mint transition-[stroke-dasharray] duration-300 motion-reduce:transition-none', !known && 'motion-reduce:hidden')}
        />
      </g>
      {!known && <circle cx={SIDE / 2} cy={SIDE / 2} r={radius} fill="none" strokeWidth={thickness} className="hidden stroke-mint/60 motion-reduce:inline" />}
    </svg>
  );
};

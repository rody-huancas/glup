import { useId, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FAMILY_IDS } from '@/modules/families/constants/families';
import { ACTIVITY_CHART, ACTIVITY_MOTION, ACTIVITY_TEXTS, PLACEHOLDER_BARS } from '@/modules/home/constants/activity';
import type { ActivityBucket } from '@/modules/home/interfaces/activityBucket';
import { ActivityTable } from '@/modules/home/components/ActivityTable';
import { bucketSummary } from '@/modules/home/utils/activity';
import { useElementSize } from '@/shared/hooks/useElementSize';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

interface ActivityChartProps {
  buckets : ActivityBucket[];
  // What the bars span, for the chart's name ("Esta semana").
  range   : string;
}

// Vertical capsules, one per period, stacked by family in its color, drawn in SVG at the box's own size.
// Hover or focus a bar for its balloon. Without data, striped stand-in bars and «Aún no hay datos»
// (never numbers that look real). The bars grow in when they show, unless motion is reduced.
export const ActivityChart = ({ buckets, range }: ActivityChartProps) => {
  const { ref, size }       = useElementSize<HTMLDivElement>();
  const svg                 = useRef<SVGSVGElement | null>(null);
  const reduced             = usePrefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const id                  = useId();
  const stripes             = `${id}-stripes`;
  const max                 = Math.max(0, ...buckets.map((bucket) => bucket.total));
  const empty               = max === 0;
  const { height, labels }  = ACTIVITY_CHART;
  const plot                = height - labels;
  const slot                = size.width / Math.max(1, buckets.length);
  const bar                 = Math.min(ACTIVITY_CHART.maxBar, slot * ACTIVITY_CHART.share);

  useGSAP(
    () => {
      if (reduced || !svg.current || size.width === 0) return;
      gsap.fromTo(svg.current.querySelectorAll('[data-bar]'), { scaleY: 0 }, { scaleY: 1, duration: ACTIVITY_MOTION.duration, stagger: ACTIVITY_MOTION.stagger, ease: ACTIVITY_MOTION.ease });
    },
    { dependencies: [range, empty, size.width > 0], scope: svg },
  );

  const shown = active === null ? null : buckets[active];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {size.width > 0 && (
        <svg ref={svg} role="group" aria-label={ACTIVITY_TEXTS.chart(range)} width={size.width} height={height} className="block overflow-visible">
          <defs>
            <pattern id={stripes} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--color-raised)" />
              <rect width="2.5" height="6" fill="var(--color-line-strong)" />
            </pattern>
          </defs>
          {buckets.map((bucket, index) => {
            const x      = slot * index + (slot - bar) / 2;
            const full   = empty ? PLACEHOLDER_BARS[index % PLACEHOLDER_BARS.length] * plot : (bucket.total / max) * plot;
            const top    = plot - full;
            const clip   = `${id}-bar-${index}`;
            let   offset = plot;

            return (
              <g
                key={bucket.start}
                tabIndex={empty ? -1 : 0}
                aria-label={empty ? undefined : bucketSummary(bucket)}
                onPointerEnter={() => !empty && setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none [&:focus-visible>.bar-focus]:opacity-100"
              >
                {/* The whole slot takes the pointer, so short bars are easy to reach. */}
                <rect x={slot * index} y={0} width={slot} height={plot} fill="transparent" />
                <rect className="bar-focus opacity-0" x={x - 3} y={top - 3} width={bar + 6} height={full + 6} rx={(bar + 6) / 2} fill="none" stroke="var(--color-lilac)" strokeWidth={2} />
                <clipPath id={clip}>
                  <rect x={x} y={top} width={bar} height={full} rx={bar / 2} />
                </clipPath>
                <g data-bar clipPath={`url(#${clip})`} style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }} opacity={active !== null && active !== index ? 0.55 : 1}>
                  {empty ? (
                    <rect x={x} y={top} width={bar} height={full} fill={`url(#${stripes})`} opacity={0.6} />
                  ) : (
                    FAMILY_IDS.filter((family) => bucket.counts[family] > 0).map((family) => {
                      const piece = (bucket.counts[family] / bucket.total) * full;
                      offset     -= piece;
                      return <rect key={family} x={x} y={offset} width={bar} height={Math.max(0, piece - ACTIVITY_CHART.gap / 2)} fill={`var(--color-fam-${family})`} />;
                    })
                  )}
                </g>
                <text x={slot * index + slot / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{bucket.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      {empty && (
        <span className="pointer-events-none absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong bg-surface px-3 py-1 text-[11px] font-semibold text-muted">
          {ACTIVITY_TEXTS.noData}
        </span>
      )}
      {shown && active !== null && (
        <span
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[10px] border border-line-strong bg-surface px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-text"
          style={{ left: Math.min(Math.max(slot * active + slot / 2, 70), size.width - 70), top: Math.max(0, plot - (shown.total / Math.max(1, max)) * plot - 8) }}
        >
          {bucketSummary(shown)}
        </span>
      )}
      <ActivityTable buckets={buckets} />
    </div>
  );
};

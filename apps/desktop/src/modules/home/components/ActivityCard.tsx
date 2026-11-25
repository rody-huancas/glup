import { useMemo, useState } from 'react';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { ActivityChart } from '@/modules/home/components/ActivityChart';
import { ActivityRangePicker } from '@/modules/home/components/ActivityRangePicker';
import { ACTIVITY_TEXTS } from '@/modules/home/constants/activity';
import { DASHBOARD_TEXTS, minutesOf } from '@/modules/home/constants/dashboard';
import type { ActivityRange } from '@/modules/home/types/activityRange';
import { activityBuckets, periodStats, rangeStart } from '@/modules/home/utils/activity';
import { TOOLS } from '@/modules/tools/constants/tools';

interface ActivityCardProps {
  entries : HistoryEntry[];
  now     : Date;
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-[20px] leading-6 font-bold tracking-[-0.02em] text-text tabular-nums">{value}</span>
    <span className="truncate text-[11px] text-muted">{label}</span>
  </div>
);

// «Lo que hicimos»: the four numbers of the span on view and its chart, all from the local Historial.
export const ActivityCard = ({ entries, now }: ActivityCardProps) => {
  const [range, setRange] = useState<ActivityRange>('week');
  const buckets           = useMemo(() => activityBuckets({ entries, tools: TOOLS, range, now }), [entries, range, now]);
  const stats             = useMemo(() => periodStats(entries, rangeStart(range, now)), [entries, range, now]);

  return (
    <section aria-labelledby="activity-title" className="flex shrink-0 flex-col gap-2.5 rounded-[18px] border border-line bg-raised px-4 pt-3 pb-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-title" className="text-[13px] font-semibold text-text">{ACTIVITY_TEXTS.title}</h2>
        <ActivityRangePicker range={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-4">
        <Stat value={String(stats.files)} label={DASHBOARD_TEXTS.files(stats.files)} />
        <Stat value={formatFileSize(stats.savedBytes)} label={DASHBOARD_TEXTS.saved} />
        <Stat value={`${minutesOf(stats.audioSeconds)} min`} label={DASHBOARD_TEXTS.audio} />
        <Stat value={String(stats.screenTexts)} label={DASHBOARD_TEXTS.screenTexts(stats.screenTexts)} />
      </div>
      <ActivityChart buckets={buckets} range={ACTIVITY_TEXTS.ranges[range]} />
    </section>
  );
};

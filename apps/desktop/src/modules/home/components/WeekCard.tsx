import { useMemo } from 'react';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { WeekCapsules } from '@/modules/home/components/WeekCapsules';
import { DASHBOARD_TEXTS, WEEK_STATS, minutesOf } from '@/modules/home/constants/dashboard';
import type { WeekStat } from '@/modules/home/interfaces/weekStat';
import { activityBuckets, periodStats, rangeStart } from '@/modules/home/utils/activity';
import { topStats } from '@/modules/home/utils/weekStats';
import { TOOLS } from '@/modules/tools/constants/tools';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { formatCount } from '@/shared/utils/numbers';

interface WeekCardProps {
  entries : HistoryEntry[];
  now     : Date;
  onOpen  : () => void;
}

const said = (stat: WeekStat): { value: string; label: string } => {
  if (stat.kind === 'files') return { value: formatCount(stat.value), label: DASHBOARD_TEXTS.files(stat.value) };
  if (stat.kind === 'saved') return { value: formatFileSize(stat.value), label: DASHBOARD_TEXTS.saved };
  if (stat.kind === 'audio') return { value: minutesOf(stat.value), label: DASHBOARD_TEXTS.minutes(stat.value) };
  return { value: formatCount(stat.value), label: DASHBOARD_TEXTS.screenTexts(stat.value) };
};

// «Esta semana hicimos»: the two numbers that matter most (never a zero) and the seven days in small
// capsules; with nothing this week, it says so over dim capsules. The whole card opens the big chart.
export const WeekCard = ({ entries, now, onOpen }: WeekCardProps) => {
  const days  = useMemo(() => activityBuckets({ entries, tools: TOOLS, range: 'week', now }), [entries, now]);
  const stats = useMemo(() => topStats(periodStats(entries, rangeStart('week', now)), WEEK_STATS), [entries, now]);

  return (
    <button
      type="button"
      {...REVEAL_PROPS.card}
      onClick={onOpen}
      aria-label={DASHBOARD_TEXTS.weekOpen}
      className="flex min-h-[152px] min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-[22px] border border-line bg-raised p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-lilac"
    >
      <span className="text-[13px] font-semibold text-text">{DASHBOARD_TEXTS.week}</span>
      {stats.length === 0 ? (
        <span className="text-[13px] text-muted">{DASHBOARD_TEXTS.weekEmpty}</span>
      ) : (
        <span className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const { value, label } = said(stat);
            return (
              <span key={stat.kind} className="flex min-w-0 flex-col">
                <span className="truncate text-[22px] leading-7 font-bold tracking-[-0.02em] text-text tabular-nums">{value}</span>
                <span className="text-[11px] leading-tight text-muted">{label}</span>
              </span>
            );
          })}
        </span>
      )}
      <WeekCapsules days={days} />
    </button>
  );
};

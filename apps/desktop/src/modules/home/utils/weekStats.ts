import type { PeriodStats } from '@/modules/home/interfaces/periodStats';
import type { WeekStat } from '@/modules/home/interfaces/weekStat';

// The most important numbers of the week that are not zero (at most `limit`), in this order.
export const topStats = (stats: PeriodStats, limit: number): WeekStat[] => {
  const all: WeekStat[] = [
    { kind: 'files', value: stats.files },
    { kind: 'saved', value: stats.savedBytes },
    { kind: 'audio', value: stats.audioSeconds },
    { kind: 'screenTexts', value: stats.screenTexts },
  ];
  return all.filter((stat) => stat.value > 0).slice(0, limit);
};

import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { UsageMeter } from '@/modules/performance/components/UsageMeter';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { Overview } from '@/modules/performance/interfaces/overview';
import { cpuLevel, cpuPhrase, diskLevel, diskPhrase, memoryLevel, memoryPercent, memoryPhrase } from '@/modules/performance/utils/phrases';

interface UsageSummaryProps {
  overview: Overview;
}

export const UsageSummary = ({ overview }: UsageSummaryProps) => {
  const memory = memoryPercent(overview.memoryUsed, overview.memoryTotal);
  const disk   = overview.diskBusy;

  return (
    <div className="grid grid-cols-3 gap-2">
      <UsageMeter label={PERFORMANCE_TEXTS.processor} percent={overview.cpu} level={cpuLevel(overview.cpu)} phrase={cpuPhrase(overview.cpu)} />
      <UsageMeter
        label={PERFORMANCE_TEXTS.memory}
        percent={memory}
        level={memoryLevel(memory)}
        phrase={memoryPhrase(memory)}
        detail={PERFORMANCE_TEXTS.memoryOf(formatFileSize(overview.memoryUsed), formatFileSize(overview.memoryTotal))}
      />
      <UsageMeter
        label={PERFORMANCE_TEXTS.disk}
        percent={disk}
        level={disk === null ? 'calm' : diskLevel(disk)}
        phrase={disk === null ? PERFORMANCE_TEXTS.diskUnknown : diskPhrase(disk)}
      />
    </div>
  );
};

import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';
import { DASHBOARD_TEXTS } from '@/modules/home/constants/dashboard';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useOverview } from '@/modules/performance/hooks/useOverview';
import { memoryPercent } from '@/modules/performance/utils/phrases';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface HomePcProps {
  disk       : DiskSpace | null;
  onNavigate : (page: PageId) => void;
}

const Meter = ({ label, value, share }: { label: string; value: string; share: number | null }) => (
  <div className="flex flex-col gap-1">
    <span className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="font-semibold text-text">{label}</span>
      <span className="truncate text-muted">{value}</span>
    </span>
    <span aria-hidden className="h-1 overflow-hidden rounded-full bg-line">
      {share !== null && <span className="block h-full rounded-full bg-fam-pc" style={{ width: `${Math.round(share * 100)}%` }} />}
    </span>
  </div>
);

// "Tu PC", small: free room on the disk and the memory in use (read while it is in view), and the way to
// Rendimiento.
export const HomePc = ({ disk, onNavigate }: HomePcProps) => {
  const { overview } = useOverview();
  const memory       = overview ? memoryPercent(overview.memoryUsed, overview.memoryTotal) : null;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <SectionLabel>{DASHBOARD_TEXTS.pc}</SectionLabel>
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-raised p-3">
        <Meter label={DASHBOARD_TEXTS.disk} value={disk ? DASHBOARD_TEXTS.diskFree(disk.free, disk.total) : DASHBOARD_TEXTS.reading} share={disk && disk.total > 0 ? 1 - disk.free / disk.total : null} />
        <Meter label={DASHBOARD_TEXTS.memory} value={memory === null ? DASHBOARD_TEXTS.reading : DASHBOARD_TEXTS.memoryUsed(memory)} share={memory === null ? null : memory / 100} />
        <button type="button" onClick={() => onNavigate('performance')} className="self-start cursor-pointer rounded-md text-[12px] font-semibold text-lilac outline-none hover:text-lilac-soft focus-visible:outline-2 focus-visible:outline-lilac">
          {DASHBOARD_TEXTS.performance}
        </button>
      </div>
    </section>
  );
};

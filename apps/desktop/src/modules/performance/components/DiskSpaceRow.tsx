import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { DiskSpace } from '@/modules/performance/interfaces/diskSpace';
import { spaceWarning } from '@/modules/performance/utils/phrases';
import { cx } from '@/shared/utils/classNames';

interface DiskSpaceRowProps {
  disk       : DiskSpace;
  onCleanup  : () => void;
}

// "C: · Windows", its bar of what is used, and "Hacer espacio" (Limpieza) when little is left.
export const DiskSpaceRow = ({ disk, onCleanup }: DiskSpaceRowProps) => {
  const warning = spaceWarning(disk);
  const used    = disk.total > 0 ? Math.round(((disk.total - disk.free) / disk.total) * 100) : 0;
  const name    = disk.root.replace(/\\$/, '');

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-semibold text-text">{disk.label ? `${name} · ${disk.label}` : name}</span>
        <span className="text-muted">{PERFORMANCE_TEXTS.spaceFree(formatFileSize(disk.free), formatFileSize(disk.total))}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg" aria-hidden>
        <div className={cx('absolute inset-y-0 left-0 rounded-full', warning ? 'bg-warn' : 'bg-lilac')} style={{ width: `${used}%` }} />
      </div>
      {warning && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-warn">{warning}</span>
          <button type="button" onClick={onCleanup} className="cursor-pointer rounded-md text-[12px] font-semibold text-lilac outline-none hover:text-lilac-soft focus-visible:outline-2 focus-visible:outline-lilac">
            {PERFORMANCE_TEXTS.toCleanup}
          </button>
        </div>
      )}
    </li>
  );
};

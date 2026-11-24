import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { AppIcon } from '@/modules/performance/components/AppIcon';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { AppUsage } from '@/modules/performance/interfaces/appUsage';
import { percentText } from '@/modules/performance/utils/phrases';
import { Button } from '@/shared/components/Button';

interface TopAppRowProps {
  app     : AppUsage;
  isGlup  : boolean;
  onClose : (app: AppUsage) => void;
}

export const TopAppRow = ({ app, isGlup, onClose }: TopAppRowProps) => (
  <li className="flex items-center gap-3 rounded-[14px] border border-line bg-raised px-3 py-2">
    <AppIcon path={app.exe} />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13px] font-semibold text-text">{app.name}</span>
      <span className="truncate text-[11px] text-muted">
        {formatFileSize(app.memory)} · {PERFORMANCE_TEXTS.cpuShare(percentText(app.cpu))} · {PERFORMANCE_TEXTS.processes(app.processes)}
      </span>
    </div>
    {app.protected ? (
      <span className="shrink-0 text-[11px] text-muted">{isGlup ? PERFORMANCE_TEXTS.glup : PERFORMANCE_TEXTS.protected}</span>
    ) : (
      <Button variant="secondary" onClick={() => onClose(app)} className="h-8 shrink-0 px-3 text-xs">
        <span aria-hidden>{PERFORMANCE_TEXTS.close}</span>
        <span className="sr-only">{PERFORMANCE_TEXTS.closeLabel(app.name)}</span>
      </Button>
    )}
  </li>
);

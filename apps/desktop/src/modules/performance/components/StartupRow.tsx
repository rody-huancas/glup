import { AppIcon } from '@/modules/performance/components/AppIcon';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { StartupEntry } from '@/modules/performance/interfaces/startupEntry';
import { Switch } from '@/shared/components/Switch';

interface StartupRowProps {
  entry    : StartupEntry;
  busy     : boolean;
  onToggle : (entry: StartupEntry, enabled: boolean) => void;
}

export const StartupRow = ({ entry, busy, onToggle }: StartupRowProps) => (
  <li className="flex items-center gap-3 rounded-[14px] border border-line bg-raised px-3 py-2">
    <AppIcon path={entry.path} />
    <div className="min-w-0 flex-1">
      <Switch
        label={entry.name}
        hint={entry.canChange ? undefined : PERFORMANCE_TEXTS.everyone}
        checked={entry.enabled}
        disabled={busy || !entry.canChange}
        onChange={(enabled) => onToggle(entry, enabled)}
      />
    </div>
  </li>
);

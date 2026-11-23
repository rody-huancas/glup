import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { useAutostart } from '@/modules/settings/hooks/useAutostart';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

export const AutostartToggle = () => {
  const autostart = useAutostart();
  const enabled   = autostart.enabled ?? false;

  if (autostart.enabled === null && !autostart.failed) return <Skeleton className="h-9 w-72" />;

  return (
    <Switch
      label={GENERAL_TEXTS.autostart}
      hint={autostart.failed ? GENERAL_TEXTS.autostartError : enabled ? GENERAL_TEXTS.autostartHint : GENERAL_TEXTS.autostartOffHint}
      checked={enabled}
      disabled={autostart.saving}
      onChange={autostart.change}
    />
  );
};

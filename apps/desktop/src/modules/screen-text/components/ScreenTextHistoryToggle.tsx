import { SCREEN_HISTORY_TEXTS } from '@/modules/screen-text/constants/texts';
import { useScreenTextHistorySetting } from '@/modules/screen-text/hooks/useScreenTextHistorySetting';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

export const ScreenTextHistoryToggle = () => {
  const setting = useScreenTextHistorySetting();

  if (setting.enabled === null) return <Skeleton className="h-9 w-72" />;

  return (
    <Switch
      label={SCREEN_HISTORY_TEXTS.label}
      hint={setting.enabled ? SCREEN_HISTORY_TEXTS.hint : SCREEN_HISTORY_TEXTS.offHint}
      checked={setting.enabled}
      onChange={setting.change}
    />
  );
};

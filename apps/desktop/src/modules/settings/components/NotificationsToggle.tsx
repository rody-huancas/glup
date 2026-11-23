import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { useNotificationsSetting } from '@/modules/settings/hooks/useNotificationsSetting';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

export const NotificationsToggle = () => {
  const setting = useNotificationsSetting();

  if (setting.enabled === null) return <Skeleton className="h-9 w-72" />;

  return <Switch label={GENERAL_TEXTS.notifications} hint={GENERAL_TEXTS.notificationsTip} checked={setting.enabled} onChange={setting.change} />;
};

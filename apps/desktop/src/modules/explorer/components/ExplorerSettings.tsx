import { EXPLORER_TEXTS } from '@/modules/explorer/constants/texts';
import { useExplorerSettings } from '@/modules/explorer/hooks/useExplorerSettings';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

// Ajustes › General: Glup in the Explorer's right click and in «Enviar a».
export const ExplorerSettings = () => {
  const setting = useExplorerSettings();

  if (setting.menu === null || setting.sendTo === null) return <Skeleton className="h-20 w-72" />;

  return (
    <div className="flex flex-col gap-3">
      <Switch label={EXPLORER_TEXTS.menu} hint={EXPLORER_TEXTS.menuHint} checked={setting.menu} onChange={setting.changeMenu} />
      <Switch label={EXPLORER_TEXTS.sendTo} hint={EXPLORER_TEXTS.sendToHint} checked={setting.sendTo} onChange={setting.changeSendTo} />
      {setting.failed && <p role="alert" className="text-[11px] text-lilac-soft">{EXPLORER_TEXTS.failed}</p>}
    </div>
  );
};

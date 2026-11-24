import { IslandLookSetting } from '@/modules/dock/components/IslandLookSetting';
import { DEFAULT_DOCK } from '@/modules/dock/constants/dock';
import { useDockSetting } from '@/modules/dock/hooks/useDockSetting';

// "Cómo se muestra" for the edge Glup is on now.
export const IslandLook = () => {
  const { resolved } = useDockSetting();
  return <IslandLookSetting edge={resolved?.dock.edge ?? DEFAULT_DOCK.edge} />;
};

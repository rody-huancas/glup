import { IslandDropZone } from '@/modules/island/components/IslandDropZone';
import { IslandMascotSlot } from '@/modules/island/components/IslandMascotSlot';
import { useIsland } from '@/modules/island/hooks/useIsland';
import { getPanelStyle } from '@/modules/island/utils/islandStyles';
import { Mascot } from '@/modules/mascot/components/Mascot';

export const Island = () => {
  const { elements, onMascotStateChange } = useIsland();

  return (
    <div className="flex h-full w-full items-start justify-center">
      <div ref={elements.panel} className="relative shrink-0 overflow-hidden" style={getPanelStyle('collapsed')}>
        <IslandMascotSlot slotRef={elements.mascot}>
          <Mascot onStateChange={onMascotStateChange} />
        </IslandMascotSlot>
        <IslandDropZone zoneRef={elements.dropZone} />
      </div>
    </div>
  );
};

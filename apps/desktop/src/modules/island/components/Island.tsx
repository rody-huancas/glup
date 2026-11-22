import { ActionsPanel } from '@/modules/actions/components/ActionsPanel';
import { IslandActionsSlot } from '@/modules/island/components/IslandActionsSlot';
import { IslandDropZone } from '@/modules/island/components/IslandDropZone';
import { IslandMascotSlot } from '@/modules/island/components/IslandMascotSlot';
import { ISLAND_TEXTS } from '@/modules/island/constants/island';
import { useIsland } from '@/modules/island/hooks/useIsland';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getPanelStyle } from '@/modules/island/utils/islandStyles';
import { Mascot } from '@/modules/mascot/components/Mascot';

const INITIAL_LAYOUT = getIslandLayout({ target: 'collapsed', actionsHeight: 0 });

export const Island = () => {
  const {
    state,
    elements,
    mascotRef,
    notice,
    selection,
    phase,
    choose,
    close,
    onMascotStateChange,
  } = useIsland();

  return (
    <div className="flex h-full w-full items-start justify-center">
      <div ref={elements.panel} className="relative shrink-0 overflow-hidden" style={getPanelStyle(INITIAL_LAYOUT)}>
        <IslandMascotSlot slotRef={elements.mascot}>
          <Mascot onStateChange={onMascotStateChange} controllerRef={mascotRef} happyEyes={state === 'actions'} />
        </IslandMascotSlot>
        <IslandDropZone zoneRef={elements.dropZone} message={notice ?? ISLAND_TEXTS.dropHere} />
        <IslandActionsSlot slotRef={elements.actions} interactive={state === 'actions'}>
          {selection && <ActionsPanel selection={selection} phase={phase} onChoose={choose} onClose={close} />}
        </IslandActionsSlot>
      </div>
    </div>
  );
};

import { IslandContent } from '@/modules/island/components/IslandContent';
import { IslandMascotFlyer } from '@/modules/island/components/IslandMascotFlyer';
import { IslandNoticeView } from '@/modules/island/components/IslandNoticeView';
import { IslandPillAnchor } from '@/modules/island/components/IslandPillAnchor';
import { IslandPillDot } from '@/modules/island/components/IslandPillDot';
import { IslandPillProgress } from '@/modules/island/components/IslandPillProgress';
import { IslandSilhouette } from '@/modules/island/components/IslandSilhouette';
import { ISLAND_SHAPES } from '@/modules/island/constants/islandShape';
import { useIsland } from '@/modules/island/hooks/useIsland';
import { getShapeStyle } from '@/modules/island/utils/islandShape';
import { MainPanel } from '@/modules/main-window/components/MainPanel';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { preventSelectionStart } from '@/shared/utils/selection';

// The panel is clipped to the SVG silhouette, so the content and Glup never spill past its outline.
export const Island = () => {
  const { state, elements, panel, controls, limbsVisible, notice, progress, pendingSelection, onMascotClick, onPanelPointerDown } = useIsland();
  const expanded = state === 'expanded';

  return (
    <div className="flex h-full w-full items-start justify-center" onMouseDown={preventSelectionStart}>
      <div
        ref={elements.panel}
        className="relative shrink-0 overflow-hidden"
        style={getShapeStyle(ISLAND_SHAPES.collapsed)}
        onPointerDownCapture={onPanelPointerDown}
      >
        <IslandSilhouette fillRef={elements.fill} outlineRef={elements.outline} />
        <IslandContent contentRef={elements.content} interactive={expanded}>
          <MainPanel panel={panel} controls={controls} avatarAnchorRef={elements.avatarAnchor} />
        </IslandContent>
        <IslandPillAnchor anchorRef={elements.pillAnchor} />
        <IslandNoticeView anchorRef={elements.noticeAnchor} textRef={elements.noticeText} notice={notice} />
        <IslandPillProgress visible={progress.visible} fraction={progress.fraction} />
        <IslandPillDot visible={pendingSelection && notice === null} />
        <IslandMascotFlyer liftRef={elements.lift} flyerRef={elements.flyer} squashRef={elements.squash} hidden={panel.fullScreen || panel.welcome.visible}>
          <Mascot
            controllerRef={panel.avatarRef}
            onStateChange={panel.onAvatarStateChange}
            onClick={onMascotClick}
            reactToDrops={false}
            limbs={limbsVisible}
          />
        </IslandMascotFlyer>
      </div>
    </div>
  );
};

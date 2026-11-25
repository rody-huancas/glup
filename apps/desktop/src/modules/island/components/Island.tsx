import { useEffect } from 'react';
import { dockRegion } from '@/modules/dock/utils/dockLayout';
import { IslandBubbleButton } from '@/modules/island/components/IslandBubbleButton';
import { IslandBubbleRing } from '@/modules/island/components/IslandBubbleRing';
import { IslandBubbleShadow } from '@/modules/island/components/IslandBubbleShadow';
import { IslandContent } from '@/modules/island/components/IslandContent';
import { IslandMascotFlyer } from '@/modules/island/components/IslandMascotFlyer';
import { IslandNoticeView } from '@/modules/island/components/IslandNoticeView';
import { IslandPillAnchor } from '@/modules/island/components/IslandPillAnchor';
import { IslandPillDot } from '@/modules/island/components/IslandPillDot';
import { IslandPillProgress } from '@/modules/island/components/IslandPillProgress';
import { IslandSilhouette } from '@/modules/island/components/IslandSilhouette';
import { useIsland } from '@/modules/island/hooks/useIsland';
import { useIslandBorder } from '@/modules/island/hooks/useIslandBorder';
import { setPanelOpen } from '@/modules/island/store/panelStore';
import { rectStyle } from '@/modules/island/utils/islandStyles';
import { MainPanel } from '@/modules/main-window/components/MainPanel';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { cx } from '@/shared/utils/classNames';
import { preventSelectionStart } from '@/shared/utils/selection';

// The panel covers the whole window and is clipped to the SVG silhouette of the island's edge, so the
// content and Glup never spill past its outline. Everything inside is placed for that edge, upright. The
// bubble adds its shadow and its progress ring around the circle, outside the clip.
export const Island = () => {
  const island                         = useIsland();
  useIslandBorder();
  const { elements, panel, placement } = island;
  const expanded                       = island.state === 'expanded';
  const bubble                         = placement.kind === 'bubble';
  const resting                        = island.state === 'collapsed' && island.notice === null;
  const frame                          = { width: `${placement.frame.width}px`, height: `${placement.frame.height}px` };

  // Screens that read only while seen (Rendimiento) know when the panel is open.
  useEffect(() => setPanelOpen(expanded), [expanded]);

  return (
    <div className="relative h-full w-full" onMouseDown={preventSelectionStart}>
      {/* While it is dragged, a soft halo marks where it lands. */}
      <div
        aria-hidden
        className={cx(
          'pointer-events-none absolute ring-2 ring-inset ring-lilac/60 transition-opacity duration-150 motion-reduce:transition-none',
          bubble ? 'rounded-full' : 'rounded-[18px]',
          island.dragging ? 'opacity-100' : 'opacity-0',
        )}
        style={rectStyle(dockRegion(placement, 'collapsed'))}
      />
      {bubble && <IslandBubbleShadow visible={resting} placement={placement} />}
      <div
        ref={elements.panel}
        className="absolute left-0 top-0 overflow-hidden"
        style={frame}
        onPointerDownCapture={island.onPanelPointerDown}
        onPointerDown={island.onDragPointerDown}
      >
        <IslandSilhouette fillRef={elements.fill} outlineRef={elements.outline} glowRef={elements.glow} />
        <IslandContent contentRef={elements.content} placement={placement} interactive={expanded}>
          <MainPanel panel={panel} controls={island.controls} avatarAnchorRef={elements.avatarAnchor} />
        </IslandContent>
        <IslandPillAnchor anchorRef={elements.pillAnchor} placement={placement} />
        <IslandNoticeView anchorRef={elements.noticeAnchor} textRef={elements.noticeText} notice={island.notice} placement={placement} onView={island.onNoticeView} onViewPage={island.onNoticePage} />
        <IslandPillProgress visible={island.progress.visible && !bubble} fraction={island.progress.fraction} placement={placement} />
        <IslandPillDot visible={island.pendingSelection && island.notice === null} placement={placement} />
        <IslandMascotFlyer liftRef={elements.lift} flyerRef={elements.flyer} squashRef={elements.squash} hidden={panel.fullScreen || panel.welcome.visible}>
          <Mascot
            controllerRef={panel.avatarRef}
            onStateChange={panel.onAvatarStateChange}
            onClick={island.onMascotClick}
            reactToDrops={false}
            limbs={island.limbsVisible}
            peek
          />
        </IslandMascotFlyer>
        {bubble && island.state === 'collapsed' && <IslandBubbleButton placement={placement} onOpen={island.onMascotClick} />}
      </div>
      {bubble && <IslandBubbleRing visible={island.progress.visible} fraction={island.progress.fraction} placement={placement} />}
    </div>
  );
};

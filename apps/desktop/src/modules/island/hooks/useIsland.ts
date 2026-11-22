import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandFocus } from '@/modules/island/hooks/useIslandFocus';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useIslandTimeline } from '@/modules/island/hooks/useIslandTimeline';
// import { useIslandTransitions } from '@/modules/island/hooks/useIslandTransitions';
import type { IslandState } from '@/modules/island/types/islandState';
import { createIslandElements } from '@/modules/island/utils/elements';
import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

export const useIsland = () => {
  const [state, setState]   = useState<IslandState>('collapsed');
  const [pinned, setPinned] = useState(false);
  const [locked, setLocked] = useState(false);
  const insideRef           = useRef(false);
  const elements            = useMemo(createIslandElements, []);
  const panel               = useMainWindow();
  const resetPanel          = panel.reset;

  const { takeFocus, releaseFocus }    = useIslandFocus();
  const { transitionTo, hide, reveal, hover, limbsVisible } = useIslandTimeline({ elements, setState, mascotRef: panel.avatarRef });
  // const { transitionTo, hide, reveal } = useIslandTransitions({ elements, setState });

  const expand = useCallback((pin: boolean) => {
    if (pin) setPinned(true);
    void transitionTo('expanded');
  }, [transitionTo]);

  // Collapsing always unpins, gives the focus back and leaves the panel on a clean home page.
  // If the cursor is still over the island, hover stays locked until it leaves, so it does not reopen.
  // farewell: closed on purpose (Recoger, Esc) rather than because the cursor left.
  const collapse = useCallback(async (farewell: boolean) => {
    setPinned(false);
    setLocked(insideRef.current);
    releaseFocus();
    if (await transitionTo('collapsed', farewell)) resetPanel();
  }, [releaseFocus, transitionTo, resetPanel]);

  const expandOnHover   = useCallback(() => expand(false), [expand]);
  const openPinned      = useCallback(() => expand(true), [expand]);
  const collapseNow     = useCallback(() => void collapse(true), [collapse]);
  const collapseOnLeave = useCallback(() => void collapse(false), [collapse]);
  // const collapseNow   = useCallback(() => void collapse(), [collapse]);
  const togglePin       = useCallback(() => setPinned((previous) => !previous), []);

  const onFullscreenEnter = useCallback(() => {
    setPinned(false);
    releaseFocus();
    resetPanel();
    void hide();
  }, [releaseFocus, resetPanel, hide]);

  const { inside, dragging } = useIslandSignals({
    onFullscreenEnter,
    onFullscreenExit : reveal,
    onOpenRequest    : openPinned,
  });

  useEffect(() => {
    insideRef.current = inside;
    if (!inside) setLocked(false);
  }, [inside]);

  const hovering = inside && !locked;

  useEffect(() => {
    if (state === 'collapsed') hover(hovering);
  }, [state, hovering, hover]);

  useIslandAutoToggle({
    state,
    inside   : hovering,
    dragging,
    blocked  : pinned || dragging || panel.busy,
    expand   : expandOnHover,
    collapse : collapseOnLeave,
  });

  useKeyDown({ key: 'Escape', enabled: state === 'expanded', handler: collapseNow });

  const actionsVisible = state === 'expanded' && panel.files.selection !== null;

  useEffect(() => {
    if (actionsVisible) takeFocus();
  }, [actionsVisible, takeFocus]);

  const onPanelPointerDown = useCallback(() => {
    if (state === 'expanded') takeFocus();
  }, [state, takeFocus]);

  const onMascotClick = useCallback(() => {
    if (state === 'collapsed') openPinned();
  }, [state, openPinned]);

  const controls = useMemo<PanelControlsProps>(
    () => ({ pinned, onTogglePin: togglePin, onCollapse: collapseNow }),
    [pinned, togglePin, collapseNow],
  );

  return { state, elements, panel, controls, limbsVisible, onMascotClick, onPanelPointerDown };
};

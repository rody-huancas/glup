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
import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import { getRunningTask, getTaskFraction } from '@/modules/tasks/utils/taskView';
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
  const { transitionTo, hide, reveal, hover, limbsVisible, notice, notify } = useIslandTimeline({ elements, setState, mascotRef: panel.avatarRef });
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

  // Tasks run on their own; with the island collapsed the pill shows progress and a notice at the end.
  const tasks    = useTasks();
  const running  = getRunningTask(tasks);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const onTaskFinish = useCallback((task: Task) => {
    if (stateRef.current === 'collapsed' && task.result) notify({ message: task.result.message, tone: task.result.tone });
  }, [notify]);

  useTaskTransitions({ tasks, onFinish: onTaskFinish });

  const progress = useMemo(
    () => ({ visible: state === 'collapsed' && running !== null && notice === null, fraction: running ? getTaskFraction(running) : null }),
    [state, running, notice],
  );

  const onMascotClick = useCallback(() => {
    if (state === 'collapsed') openPinned();
  }, [state, openPinned]);

  const controls = useMemo<PanelControlsProps>(
    () => ({ pinned, onTogglePin: togglePin, onCollapse: collapseNow }),
    [pinned, togglePin, collapseNow],
  );

  return { state, elements, panel, controls, limbsVisible, notice, progress, onMascotClick, onPanelPointerDown };
};

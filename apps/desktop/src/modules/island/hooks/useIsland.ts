import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandFocus } from '@/modules/island/hooks/useIslandFocus';
import { useIslandMachine } from '@/modules/island/hooks/useIslandMachine';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useIslandTimeline } from '@/modules/island/hooks/useIslandTimeline';
import { useIslandWatchdog } from '@/modules/island/hooks/useIslandWatchdog';
import { createIslandElements } from '@/modules/island/utils/elements';
import { hoverEnabled, toIslandState } from '@/modules/island/utils/islandMachine';
import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import { getRunningTask, getTaskFraction } from '@/modules/tasks/utils/taskView';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

// The machine decides (useIslandMachine); this hook turns its phases into animations, region, focus and
// panel resets, and feeds it the signals (cursor, fullscreen, tray, tasks). All callbacks handed to the
// timers are stable, so frequent renders (task progress) no longer restart the open and close delays.
export const useIsland = () => {
  const { machine, send } = useIslandMachine();
  const elements          = useMemo(createIslandElements, []);
  const panel             = useMainWindow();
  const resetRef          = useRef(panel.reset);
  const state             = toIslandState(machine.phase);

  useEffect(() => {
    resetRef.current = panel.reset;
  }, [panel.reset]);

  const { takeFocus, releaseFocus } = useIslandFocus();
  const { transitionTo, hide, hover, limbsVisible, notice, showNotice, isMoving } = useIslandTimeline({ elements, mascotRef: panel.avatarRef });

  const expandOnHover   = useCallback(() => send({ type: 'expand', pin: false }), [send]);
  const openPinned      = useCallback(() => send({ type: 'expand', pin: true }), [send]);
  const collapseNow     = useCallback(() => send({ type: 'collapse', farewell: true }), [send]);
  const collapseOnLeave = useCallback(() => send({ type: 'collapse', farewell: false }), [send]);
  const togglePin       = useCallback(() => send({ type: 'pin-toggled' }), [send]);

  // Tray, watchdog or leaving hidden: whatever was half done, back to a clean pill. It runs
  // before the phase effect, so an opening asked right after a reset (tray "Abrir Glup") is not undone.
  useEffect(() => {
    if (machine.resets === 0) return;

    releaseFocus();
    resetRef.current();
    void hide();
  }, [machine.resets, releaseFocus, hide]);

  // Each phase drives the view; a settle only counts if no other transition replaced it.
  useEffect(() => {
    if (machine.phase === 'expanding') {
      void transitionTo('expanded').then((done) => done && send({ type: 'settled', phase: 'expanded' }));
    }

    if (machine.phase === 'collapsing') {
      releaseFocus();
      void transitionTo('collapsed', machine.farewell).then((done) => {
        if (!done) return;

        resetRef.current();
        send({ type: 'settled', phase: 'collapsed' });
      });
    }

    if (machine.phase === 'hidden') {
      releaseFocus();
      resetRef.current();
      void hide();
    }
  }, [machine.phase, machine.farewell, transitionTo, releaseFocus, hide, send]);

  useEffect(() => {
    if (machine.phase === 'notice' && machine.notice) showNotice({ notice: machine.notice, onEnd: () => send({ type: 'notice-ended' }) });
  }, [machine.phase, machine.notice, showNotice, send]);

  const onFullscreenEnter = useCallback(() => send({ type: 'fullscreen', on: true }), [send]);
  const onFullscreenExit  = useCallback(() => send({ type: 'fullscreen', on: false }), [send]);
  const onTrayVisibility  = useCallback((hidden: boolean) => send({ type: 'tray', hidden }), [send]);

  const { inside, dragging } = useIslandSignals({ onFullscreenEnter, onFullscreenExit, onOpenRequest: openPinned, onTrayVisibility });

  useEffect(() => {
    send({ type: 'pointer', inside });
  }, [inside, send]);

  const hovering = hoverEnabled(machine);

  useEffect(() => {
    if (machine.phase === 'collapsed') hover(hovering);
  }, [machine.phase, hovering, hover]);

  useIslandAutoToggle({
    state,
    inside   : hovering,
    dragging,
    blocked  : machine.pinned || dragging || panel.busy,
    expand   : expandOnHover,
    collapse : collapseOnLeave,
  });

  useIslandWatchdog({ machine, send, isMoving });

  // While signing, Esc belongs to the signing screen (it asks before leaving).
  useKeyDown({ key: 'Escape', enabled: state === 'expanded' && panel.signing === null, handler: collapseNow });

  const actionsVisible = state === 'expanded' && panel.files.selection !== null;

  useEffect(() => {
    if (actionsVisible) takeFocus();
  }, [actionsVisible, takeFocus]);

  const onPanelPointerDown = useCallback(() => {
    if (state === 'expanded') takeFocus();
  }, [state, takeFocus]);

  // Tasks run on their own; with the island collapsed the pill shows progress and a notice at the end.
  const tasks   = useTasks();
  const running = getRunningTask(tasks);

  const onTaskFinish = useCallback((task: Task) => {
    if (task.result) send({ type: 'notice', notice: { message: task.result.message, tone: task.result.tone } });
  }, [send]);

  useTaskTransitions({ tasks, onFinish: onTaskFinish });

  const progress = useMemo(
    () => ({ visible: state === 'collapsed' && running !== null && notice === null, fraction: running ? getTaskFraction(running) : null }),
    [state, running, notice],
  );

  const onMascotClick = useCallback(() => {
    if (state === 'collapsed') openPinned();
  }, [state, openPinned]);

  const controls = useMemo<PanelControlsProps>(
    () => ({ pinned: machine.pinned, onTogglePin: togglePin, onCollapse: collapseNow }),
    [machine.pinned, togglePin, collapseNow],
  );

  return { state, elements, panel, controls, limbsVisible, notice, progress, onMascotClick, onPanelPointerDown };
};

// Previous version: state, pinned and locked as separate useState, transitions called directly from the
// handlers, and the timeline hook setting the state itself.
// import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
// import { useIslandFocus } from '@/modules/island/hooks/useIslandFocus';
// import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
// import { useIslandTimeline } from '@/modules/island/hooks/useIslandTimeline';
// // import { useIslandTransitions } from '@/modules/island/hooks/useIslandTransitions';
// import type { IslandState } from '@/modules/island/types/islandState';
// import { createIslandElements } from '@/modules/island/utils/elements';
// import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';
// import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
// import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
// import { useTasks } from '@/modules/tasks/hooks/useTasks';
// import type { Task } from '@/modules/tasks/interfaces/task';
// import { getRunningTask, getTaskFraction } from '@/modules/tasks/utils/taskView';
// import { useKeyDown } from '@/shared/hooks/useKeyDown';
//
// export const useIsland = () => {
//   const [state, setState]   = useState<IslandState>('collapsed');
//   const [pinned, setPinned] = useState(false);
//   const [locked, setLocked] = useState(false);
//   const insideRef           = useRef(false);
//   const elements            = useMemo(createIslandElements, []);
//   const panel               = useMainWindow();
//   const resetPanel          = panel.reset;
//
//   const { takeFocus, releaseFocus }    = useIslandFocus();
//   const { transitionTo, hide, reveal, hover, limbsVisible, notice, notify } = useIslandTimeline({ elements, setState, mascotRef: panel.avatarRef });
//   // const { transitionTo, hide, reveal } = useIslandTransitions({ elements, setState });
//
//   const expand = useCallback((pin: boolean) => {
//     if (pin) setPinned(true);
//     void transitionTo('expanded');
//   }, [transitionTo]);
//
//   // Collapsing always unpins, gives the focus back and leaves the panel on a clean home page.
//   // If the cursor is still over the island, hover stays locked until it leaves, so it does not reopen.
//   // farewell: closed on purpose (Recoger, Esc) rather than because the cursor left.
//   const collapse = useCallback(async (farewell: boolean) => {
//     setPinned(false);
//     setLocked(insideRef.current);
//     releaseFocus();
//     if (await transitionTo('collapsed', farewell)) resetPanel();
//   }, [releaseFocus, transitionTo, resetPanel]);
//
//   const expandOnHover   = useCallback(() => expand(false), [expand]);
//   const openPinned      = useCallback(() => expand(true), [expand]);
//   const collapseNow     = useCallback(() => void collapse(true), [collapse]);
//   const collapseOnLeave = useCallback(() => void collapse(false), [collapse]);
//   // const collapseNow   = useCallback(() => void collapse(), [collapse]);
//   const togglePin       = useCallback(() => setPinned((previous) => !previous), []);
//
//   const onFullscreenEnter = useCallback(() => {
//     setPinned(false);
//     releaseFocus();
//     resetPanel();
//     void hide();
//   }, [releaseFocus, resetPanel, hide]);
//
//   const { inside, dragging } = useIslandSignals({
//     onFullscreenEnter,
//     onFullscreenExit : reveal,
//     onOpenRequest    : openPinned,
//   });
//
//   useEffect(() => {
//     insideRef.current = inside;
//     if (!inside) setLocked(false);
//   }, [inside]);
//
//   const hovering = inside && !locked;
//
//   useEffect(() => {
//     if (state === 'collapsed') hover(hovering);
//   }, [state, hovering, hover]);
//
//   useIslandAutoToggle({
//     state,
//     inside   : hovering,
//     dragging,
//     blocked  : pinned || dragging || panel.busy,
//     expand   : expandOnHover,
//     collapse : collapseOnLeave,
//   });
//
//   // While signing, Esc belongs to the signing screen (it asks before leaving).
//   useKeyDown({ key: 'Escape', enabled: state === 'expanded' && panel.signing === null, handler: collapseNow });
//   // useKeyDown({ key: 'Escape', enabled: state === 'expanded', handler: collapseNow });
//
//   const actionsVisible = state === 'expanded' && panel.files.selection !== null;
//
//   useEffect(() => {
//     if (actionsVisible) takeFocus();
//   }, [actionsVisible, takeFocus]);
//
//   const onPanelPointerDown = useCallback(() => {
//     if (state === 'expanded') takeFocus();
//   }, [state, takeFocus]);
//
//   // Tasks run on their own; with the island collapsed the pill shows progress and a notice at the end.
//   const tasks    = useTasks();
//   const running  = getRunningTask(tasks);
//   const stateRef = useRef(state);
//
//   useEffect(() => {
//     stateRef.current = state;
//   }, [state]);
//
//   const onTaskFinish = useCallback((task: Task) => {
//     if (stateRef.current === 'collapsed' && task.result) notify({ message: task.result.message, tone: task.result.tone });
//   }, [notify]);
//
//   useTaskTransitions({ tasks, onFinish: onTaskFinish });
//
//   const progress = useMemo(
//     () => ({ visible: state === 'collapsed' && running !== null && notice === null, fraction: running ? getTaskFraction(running) : null }),
//     [state, running, notice],
//   );
//
//   const onMascotClick = useCallback(() => {
//     if (state === 'collapsed') openPinned();
//   }, [state, openPinned]);
//
//   const controls = useMemo<PanelControlsProps>(
//     () => ({ pinned, onTogglePin: togglePin, onCollapse: collapseNow }),
//     [pinned, togglePin, collapseNow],
//   );
//
//   return { state, elements, panel, controls, limbsVisible, notice, progress, onMascotClick, onPanelPointerDown };
// };

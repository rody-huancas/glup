import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RESULT_MOODS } from '@/modules/actions/constants/resultMoods';
import { revealHistoryEntry } from '@/modules/history/store/historyReveal';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandFocus } from '@/modules/island/hooks/useIslandFocus';
import { useIslandMachine } from '@/modules/island/hooks/useIslandMachine';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useLaunchOpen } from '@/modules/island/hooks/useLaunchOpen';
import { useIslandTimeline } from '@/modules/island/hooks/useIslandTimeline';
import { useIslandHolds } from '@/modules/island/hooks/useIslandHolds';
import { useIslandWatchdog } from '@/modules/island/hooks/useIslandWatchdog';
import { createIslandElements } from '@/modules/island/utils/elements';
import { ISLAND_TIMING } from '@/modules/island/constants/island';
import type { HoldReason } from '@/modules/island/types/holdReason';
import { hoverEnabled, isHeldOpen, toIslandState } from '@/modules/island/utils/islandMachine';
import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import { useTaskNotices } from '@/modules/notices/hooks/useTaskNotices';
import { notifyTask } from '@/modules/notices/services/notify';
import { panelOpened } from '@/modules/notices/store/toastStore';
import { useScreenTextDone } from '@/modules/screen-text/hooks/useScreenTextDone';
import type { ScreenTextDone } from '@/modules/screen-text/interfaces/screenTextDone';
import { screenTextNotice } from '@/modules/screen-text/utils/screenTextNotice';
import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getTasks, markForReveal, takeReveals } from '@/modules/tasks/store/taskStore';
import { pickOpenPage } from '@/modules/tasks/utils/taskOwner';
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
  // Collapsing, hiding or a reset keep everything, even a file selection not run yet (it waits as
  // pending and expires after a while); resetRef only drops that selection.
  const resetRef          = useRef(panel.discardSelection);
  const state             = toIslandState(machine.phase);
  const collapsedAt       = useRef<number | null>(null);

  useEffect(() => {
    resetRef.current = panel.discardSelection;
  }, [panel.discardSelection]);

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

        collapsedAt.current = Date.now();
        send({ type: 'settled', phase: 'collapsed' });
      });
    }

    if (machine.phase === 'hidden') {
      releaseFocus();
      void hide();
    }
  }, [machine.phase, machine.farewell, transitionTo, releaseFocus, hide, send]);

  useEffect(() => {
    if (machine.phase === 'notice' && machine.notice) showNotice({ notice: machine.notice, onEnd: () => send({ type: 'notice-ended' }) });
  }, [machine.phase, machine.notice, showNotice, send]);

  const onFullscreenEnter = useCallback(() => send({ type: 'fullscreen', on: true }), [send]);
  const onFullscreenExit  = useCallback(() => send({ type: 'fullscreen', on: false }), [send]);
  const onTrayVisibility  = useCallback((hidden: boolean) => send({ type: 'tray', hidden }), [send]);
  const onCapture         = useCallback((on: boolean) => send({ type: 'capture', on }), [send]);

  const { inside, dragging } = useIslandSignals({ onFullscreenEnter, onFullscreenExit, onOpenRequest: openPinned, onTrayVisibility, onCapture });

  useLaunchOpen({ onOpen: openPinned });

  useEffect(() => {
    send({ type: 'pointer', inside });
  }, [inside, send]);

  const hovering = hoverEnabled(machine);

  useEffect(() => {
    if (machine.phase === 'collapsed') hover(hovering);
  }, [machine.phase, hovering, hover]);

  // What the person is in the middle of keeps it open (the machine decides, see isHeldOpen).
  const dialogs = useIslandHolds();
  const holds   = useMemo(() => {
    const reasons: HoldReason[] = [];
    if (dragging) reasons.push('drag');
    // The welcome is a step too: it does not close on its own while on screen.
    if (panel.files.busy || panel.welcome.visible) reasons.push('step');
    if (panel.fullScreen) reasons.push('sign');
    if (dialogs > 0) reasons.push('dialog');
    return reasons;
  }, [dragging, panel.files.busy, panel.welcome.visible, panel.fullScreen, dialogs]);

  useEffect(() => {
    send({ type: 'holds', holds });
  }, [holds, send]);

  // First run: the island opens by itself on the welcome.
  useEffect(() => {
    if (panel.welcome.visible) send({ type: 'expand', pin: false });
  }, [panel.welcome.visible, send]);

  useIslandAutoToggle({
    state,
    inside   : hovering,
    dragging,
    blocked  : isHeldOpen(machine),
    expand   : expandOnHover,
    collapse : collapseOnLeave,
  });

  useIslandWatchdog({ machine, send, isMoving });

  // While signing or organizing, Esc belongs to that screen (it asks before leaving).
  useKeyDown({ key: 'Escape', enabled: state === 'expanded' && !panel.fullScreen, handler: collapseNow });

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

  const phaseRef  = useRef(machine.phase);
  const insideRef = useRef(machine.inside);

  useEffect(() => {
    phaseRef.current  = machine.phase;
    insideRef.current = machine.inside;
  }, [machine.phase, machine.inside]);

  // The end of a task is told once: a toast in the panel or a Windows notification.
  const notices = useTaskNotices({ phaseRef, insideRef, onNavigate: panel.navigate });

  // "Copiar texto de la pantalla" is not a task (no toast): the pill's notice with Glup's face, or a
  // Windows notification with the same words when Glup is hidden (tray, fullscreen app).
  const avatarRef    = panel.avatarRef;
  const onScreenText = useCallback((done: ScreenTextDone) => {
    const notice = screenTextNotice(done);

    if (phaseRef.current === 'hidden') {
      if (done.entryId) revealHistoryEntry(done.entryId);
      void notifyTask({ body: notice.message, page: done.entryId ? 'history' : 'tools' }).catch(() => undefined);
      return;
    }

    send({ type: 'notice', notice });
    avatarRef.current?.setState(RESULT_MOODS[notice.tone]);
  }, [send, avatarRef]);

  useScreenTextDone(onScreenText);

  // "Ver" on the notice: Historial, with that line open.
  const navigateTo   = panel.navigate;
  const onNoticeView = useCallback((entryId: string) => {
    revealHistoryEntry(entryId);
    navigateTo('history');
    openPinned();
  }, [navigateTo, openPinned]);

  // Hovering a notice with "Ver" opens the panel on that line too, as a task's notice opens its screen.
  const noticeEntry = useRef<string | null>(null);

  useEffect(() => {
    if (machine.phase === 'notice') noticeEntry.current = machine.notice?.entryId ?? null;
    else if (machine.phase !== 'expanding') noticeEntry.current = null;
  }, [machine.phase, machine.notice]);

  // A task that ends with the island collapsed: the next opening (hovering its notice included) shows
  // its owner screen.
  const onTaskFinish = useCallback((task: Task) => {
    if (toIslandState(phaseRef.current) === 'collapsed') markForReveal(task.id);
    if (task.result) send({ type: 'notice', notice: { message: task.result.message, tone: task.result.tone } });
    notices.onFinish(task);
  }, [send, notices]);

  // Dropped files whose actions were not run wait while collapsed (a lilac dot on the pill), for
  // ISLAND_TIMING.lastPageLifetime at most.
  const pending = panel.files.selection !== null;

  useEffect(() => {
    if (state !== 'collapsed' || !pending) return;

    const timer = window.setTimeout(() => resetRef.current(), ISLAND_TIMING.lastPageLifetime);
    return () => window.clearTimeout(timer);
  }, [state, pending]);

  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const navigate    = panel.navigate;
  const pageRef     = useRef(panel.page);
  const draggingRef = useRef(dragging);

  useEffect(() => {
    pageRef.current     = panel.page;
    draggingRef.current = dragging;
  }, [panel.page, dragging]);

  // On opening, the screen that matters now (see pickOpenPage).
  useEffect(() => {
    if (machine.phase !== 'expanding') return;

    const page = pickOpenPage({
      dragging    : draggingRef.current,
      reveals     : takeReveals(),
      pending     : pendingRef.current,
      tasks       : getTasks(),
      current     : pageRef.current,
      collapsedAt : collapsedAt.current,
      now         : Date.now(),
      lifetime    : ISLAND_TIMING.lastPageLifetime,
    });

    if (noticeEntry.current) {
      revealHistoryEntry(noticeEntry.current);
      noticeEntry.current = null;
      navigate('history');
    } else if (page !== pageRef.current) {
      navigate(page);
    }
    // A toast that waited for the panel shows now (unless a Windows notification already told it).
    panelOpened();
  }, [machine.phase, navigate]);

  useTaskTransitions({ tasks, onStart: notices.onStart, onFinish: onTaskFinish });

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

  return { state, elements, panel, controls, limbsVisible, notice, progress, pendingSelection: state === 'collapsed' && pending, onMascotClick, onPanelPointerDown, onNoticeView };
};

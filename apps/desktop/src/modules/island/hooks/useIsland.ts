import { RESULT_MOODS } from '@/modules/actions/constants/resultMoods';
import { useAutoFolderNotices } from '@/modules/auto-folders/hooks/useAutoFolderNotices';
import { useIslandDock } from '@/modules/dock/hooks/useIslandDock';
import { revealHistoryEntry } from '@/modules/history/store/historyReveal';
import { ISLAND_TIMING } from '@/modules/island/constants/island';
import { useBubbleLog } from '@/modules/island/hooks/useBubbleLog';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandDragGesture } from '@/modules/island/hooks/useIslandDragGesture';
import { useIslandFocus } from '@/modules/island/hooks/useIslandFocus';
import { useIslandHolds } from '@/modules/island/hooks/useIslandHolds';
import { useIslandMachine } from '@/modules/island/hooks/useIslandMachine';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useIslandTimeline } from '@/modules/island/hooks/useIslandTimeline';
import { useIslandWatchdog } from '@/modules/island/hooks/useIslandWatchdog';
import { useLaunchOpen } from '@/modules/island/hooks/useLaunchOpen';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import type { HoldReason } from '@/modules/island/types/holdReason';
import { createIslandElements } from '@/modules/island/utils/elements';
import { logBubble, logPosition } from '@/modules/island/utils/islandLog';
import { closesOnLeave, closesOnOutside, hoverEnabled, hoverOpens, toIslandState } from '@/modules/island/utils/islandMachine';
import { askedToOpen } from '@/modules/island/utils/responsiveness';
import { useMainWindow } from '@/modules/main-window/hooks/useMainWindow';
import type { PanelControlsProps } from '@/modules/main-window/interfaces/mainPanel';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useTaskNotices } from '@/modules/notices/hooks/useTaskNotices';
import { notifyTask } from '@/modules/notices/services/notify';
import { panelOpened } from '@/modules/notices/store/toastStore';
import { sendToQrReader } from '@/modules/qr/store/qrInbox';
import { useScreenTextDone } from '@/modules/screen-text/hooks/useScreenTextDone';
import type { ScreenTextDone } from '@/modules/screen-text/interfaces/screenTextDone';
import { screenTextNotice } from '@/modules/screen-text/utils/screenTextNotice';
import { useTaskTransitions } from '@/modules/tasks/hooks/useTaskTransitions';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import { getTasks, markForReveal, takeReveals } from '@/modules/tasks/store/taskStore';
import { pickOpenPage } from '@/modules/tasks/utils/taskOwner';
import { getRunningTask, getTaskFraction } from '@/modules/tasks/utils/taskView';
import { ISLAND_TOGGLE_EVENT } from '@/shared/constants/events';
import { useKeyDown } from '@/shared/hooks/useKeyDown';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';
import { useCallback, useEffect, useMemo, useRef } from 'react';

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

  // Where the island is docked; dragging it (below) moves it to another edge, corner or screen.
  const onMoving     = useCallback((on: boolean) => send({ type: 'moving', on }), [send]);
  const dock         = useIslandDock({ onMoving });
  const placementRef = useRef(dock.placement);

  const { takeFocus, releaseFocus } = useIslandFocus();
  const { transitionTo, hide, hover, limbsVisible, notice, showNotice, isMoving, relayout } = useIslandTimeline({ elements, mascotRef: panel.avatarRef, placementRef });

  // A new place (dropped, changed in Ajustes, another screen) or a new way to rest (island or hidden):
  // drawn there at once, in its current state. The machine learns how it rests.
  useEffect(() => {
    send({ type: 'rest', rest: dock.placement.rest });
    if (placementRef.current === dock.placement) return;

    placementRef.current = dock.placement;
    logPosition('redibujo la isla en su lugar nuevo');
    relayout();
  }, [dock.placement, relayout, send]);

  const hidden = machine.rest === 'hidden';
  const bubble = machine.rest === 'bubble';

  useBubbleLog(bubble);

  const expandOnHover   = useCallback(() => send({ type: 'expand', pin: false }), [send]);
  const openPinned      = useCallback(() => send({ type: 'expand', pin: true }), [send]);
  const openByClick     = useCallback(() => send({ type: 'expand', pin: false, click: true }), [send]);
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

  const { inside, dragging } = useIslandSignals({ onFullscreenEnter, onFullscreenExit, onOpenRequest: openPinned, onShowRequest: openByClick, onTrayVisibility, onCapture });

  useLaunchOpen({ onOpen: openPinned });

  useEffect(() => {
    logPosition(`cursor ${inside ? 'dentro' : 'fuera'} de la isla`);
    send({ type: 'pointer', inside });
  }, [inside, send]);

  useEffect(() => logPosition(`fase: ${machine.phase}`), [machine.phase]);

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
    // Choosing a folder ("Guardar en") takes the focus: that is not a click outside.
    if (panel.files.saveLocation.picking) reasons.push('dialog');
    if (panel.fullScreen) reasons.push('sign');
    if (dialogs > 0) reasons.push('dialog');
    return reasons;
  }, [dragging, panel.files.busy, panel.files.saveLocation.picking, panel.welcome.visible, panel.fullScreen, dialogs]);

  useEffect(() => {
    send({ type: 'holds', holds });
  }, [holds, send]);

  // First run: the island opens by itself on the welcome.
  useEffect(() => {
    if (panel.welcome.visible) send({ type: 'expand', pin: false });
  }, [panel.welcome.visible, send]);

  // The bubble opens with a click and does not close when the cursor leaves (see hoverOpens).
  useIslandAutoToggle({
    state,
    inside   : hoverOpens(machine),
    dragging,
    blocked  : !closesOnLeave(machine),
    reveal   : hidden ? dock.reveal : null,
    expand   : expandOnHover,
    collapse : collapseOnLeave,
  });

  // Since when an opening is asked for and not done (the watchdog's "not answering").
  const askedAt = useRef<number | null>(null);
  const asking  = askedToOpen(machine);

  // Answered (open or hidden) or withdrawn (the cursor left): nothing asks any more. A click is noted
  // where it happens (onMascotClick).
  useEffect(() => {
    const answered = machine.phase === 'expanding' || machine.phase === 'expanded' || machine.phase === 'hidden';
    if (answered || !machine.inside) askedAt.current = null;
    else if (asking) askedAt.current ??= Date.now();
  }, [asking, machine.phase, machine.inside]);

  useIslandWatchdog({ machine, send, isMoving, placementRef, askedAt });

  // While signing, organizing or scanning, Esc belongs to that screen (it asks before leaving).
  useKeyDown({ key: 'Escape', enabled: state === 'expanded' && !panel.fullScreen, handler: collapseNow });

  const actionsVisible = state === 'expanded' && (panel.files.selection !== null || panel.page === 'clipboard');

  useEffect(() => {
    if (actionsVisible) takeFocus();
  }, [actionsVisible, takeFocus]);

  const onPanelPointerDown = useCallback(() => {
    if (state === 'expanded') takeFocus();
  }, [state, takeFocus]);

  // The open bubble (and the panel opened from the Explorer) takes the focus, for Esc and to hear a click
  // outside: the window loses it then. A file being dragged keeps it where it is until dropped.
  const outsideCloses = closesOnOutside(machine);

  useEffect(() => {
    if (outsideCloses && machine.phase === 'expanded' && !dragging) takeFocus();
  }, [outsideCloses, machine.phase, dragging, takeFocus]);

  // An instant later, so a native dialog opened from the panel (which takes the focus too) is already
  // holding it open; and only if the focus did not come back.
  useEffect(() => {
    if (!outsideCloses) return;

    let timer    = 0;
    const onBlur = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        logBubble(`perdió el foco hace ${ISLAND_TIMING.outsideDelay} ms; foco ahora=${document.hasFocus()}`);
        if (!document.hasFocus()) send({ type: 'outside' });
      }, ISLAND_TIMING.outsideDelay);
    };

    window.addEventListener('blur', onBlur);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('blur', onBlur);
    };
  }, [outsideCloses, send]);

  // Only the resting pill (or its notice) is dragged; the window follows the edge it would land on.
  // Hidden there is no pill: it is moved from Ajustes.
  const drag = useIslandDragGesture({ enabled: !hidden && (machine.phase === 'collapsed' || machine.phase === 'notice'), onDragStart: dock.beginDrag });

  // Its shortcut opens and closes the panel (the way back to a hidden Glup), with the focus for Esc.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useTauriEvent<null>(ISLAND_TOGGLE_EVENT, () => {
    if (stateRef.current === 'expanded') return collapseNow();
    openPinned();
    takeFocus();
  });

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

  const restRef = useRef(machine.rest);

  useEffect(() => {
    restRef.current = machine.rest;
  }, [machine.rest]);

  // "Copiar texto de la pantalla" is not a task (no toast): the pill's notice with Glup's face, or a
  // Windows notification with the same words when Glup is hidden (tray, fullscreen app).
  const avatarRef    = panel.avatarRef;
  const onScreenText = useCallback((done: ScreenTextDone) => {
    const notice = screenTextNotice(done);
    // The codes of the zone wait in Leer un QR until "Ver".
    if (done.codes.length > 0) sendToQrReader({ codes: done.codes });

    // Hidden (a fullscreen app, the tray, or hidden at rest) there is no pill to tell it on.
    if (phaseRef.current === 'hidden' || restRef.current === 'hidden') {
      if (done.entryId) revealHistoryEntry(done.entryId);
      void notifyTask({ body: notice.message, page: notice.page ?? (done.entryId ? 'history' : 'tools') }).catch(() => undefined);
      return;
    }

    send({ type: 'notice', notice });
    avatarRef.current?.setState(RESULT_MOODS[notice.tone]);
  }, [send, avatarRef]);

  useScreenTextDone(onScreenText);

  // What Carpetas automáticas did, once for everything: the pill's notice, or a Windows notification
  // when there is no pill to tell it on.
  const onAutoFolders = useCallback((notice: IslandNotice) => {
    if (phaseRef.current === 'hidden' || restRef.current === 'hidden') {
      void notifyTask({ body: notice.message, page: notice.page ?? 'auto-folders' }).catch(() => undefined);
      return;
    }
    send({ type: 'notice', notice });
    avatarRef.current?.setState(RESULT_MOODS[notice.tone]);
  }, [send, avatarRef]);

  useAutoFolderNotices(onAutoFolders);

  // "Ver" on the notice: Historial, with that line open.
  const navigateTo   = panel.navigate;
  const onNoticeView = useCallback((entryId: string) => {
    revealHistoryEntry(entryId);
    navigateTo('history');
    openPinned();
  }, [navigateTo, openPinned]);

  // "Ver" of the codes found: Leer un QR.
  const onNoticePage = useCallback((page: PageId) => {
    navigateTo(page);
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

  // A click that ends a drag never opens it. Open, a click on Glup closes the bubble (Glup is the bubble).
  const consumeClick  = drag.consumeClick;
  const onMascotClick = useCallback(() => {
    if (bubble) logBubble(`clic en la burbuja (${machine.phase}, arrastrando=${machine.moving})`);
    if (consumeClick()) return;
    if (state === 'collapsed') {
      askedAt.current ??= Date.now();
      openPinned();
    }
    else if (bubble && machine.phase === 'expanded') collapseNow();
  }, [state, bubble, machine.phase, machine.moving, openPinned, collapseNow, consumeClick]);

  const controls = useMemo<PanelControlsProps>(
    () => ({ pinned: machine.pinned, onTogglePin: togglePin, onCollapse: collapseNow }),
    [machine.pinned, togglePin, collapseNow],
  );

  return {
    state,
    elements,
    panel,
    controls,
    limbsVisible,
    notice,
    progress,
    placement          : dock.placement,
    dragging           : dock.dragging,
    pendingSelection   : state === 'collapsed' && pending,
    onMascotClick,
    onPanelPointerDown,
    onDragPointerDown  : drag.onPointerDown,
    onNoticeView,
    onNoticePage,
  };
};

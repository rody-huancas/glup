import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActionSelection } from '@/modules/actions/hooks/useActionSelection';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandFlow } from '@/modules/island/hooks/useIslandFlow';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useIslandTransitions } from '@/modules/island/hooks/useIslandTransitions';
import type { IslandState, VisibleIslandState } from '@/modules/island/types/islandState';
import { createIslandElements } from '@/modules/island/utils/elements';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { setIslandFocus } from '@/modules/island/utils/islandWindow';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

export const useIsland = () => {
  const [state, setState]   = useState<IslandState>('collapsed');
  const [mascot, setMascot] = useState<MascotState>(IDLE_STATE);
  const elements            = useMemo(createIslandElements, []);
  const mascotRef           = useRef<MascotController | null>(null);
  const closeRef            = useRef<() => void>(() => undefined);
  const dropCount           = useRef(0);

  const { transitionTo, hide, reveal } = useIslandTransitions({ elements, setState });

  const onActionsFinished = useCallback(() => closeRef.current(), []);
  const actions           = useActionSelection({ onFinished: onActionsFinished });

  const layoutFor = useCallback(
    (target: VisibleIslandState) =>
      getIslandLayout({ target, actionsHeight: elements.actions.current?.offsetHeight ?? 0 }),
    [elements],
  );

  const commandMascot = useCallback((next: MascotState) => mascotRef.current?.setState(next), []);

  const openActions = useCallback(async () => {
    await transitionTo(layoutFor('actions'));
    void setIslandFocus(true);
  }, [transitionTo, layoutFor]);

  const flowParams = useMemo(
    () => ({
      mascot,
      load          : actions.load,
      commandMascot,
      onRejected    : () => void transitionTo(layoutFor('expanded')),
      onEaten       : () => void openActions(),
      onNoticeEnd   : () => closeRef.current(),
    }),
    [mascot, actions.load, commandMascot, transitionTo, layoutFor, openActions],
  );

  const flow = useIslandFlow(flowParams);

  // A drop during the collapse keeps its new selection.
  const close = useCallback(async () => {
    const dropAtClose = dropCount.current;

    flow.reset();
    void setIslandFocus(false);
    await transitionTo(layoutFor('collapsed'));

    if (dropAtClose === dropCount.current) actions.discard();
  }, [flow, transitionTo, layoutFor, actions]);

  useEffect(() => {
    closeRef.current = () => void close();
  }, [close]);

  const onDrop = useCallback((paths: string[]) => {
    dropCount.current += 1;
    void flow.handleDrop(paths);
  }, [flow]);

  const onFullscreenEnter = useCallback(() => {
    flow.reset();
    actions.discard();
    void setIslandFocus(false);
    void hide();
  }, [flow, actions, hide]);

  const { inside, dragging } = useIslandSignals({ onFullscreenEnter, onFullscreenExit: reveal, onDrop });

  useEffect(() => {
    if (actions.phase === 'working')  commandMascot({ type: 'working' });
    if (actions.phase === 'learning') commandMascot({ type: 'confused' });
  }, [actions.phase, commandMascot]);

  const expand   = useCallback(() => void transitionTo(layoutFor('expanded')), [transitionTo, layoutFor]);
  const collapse = useCallback(() => closeRef.current(), []);

  useIslandAutoToggle({
    state,
    inside,
    dragging,
    flow     : flow.flow,
    phase    : actions.phase,
    mascot   : mascot.type,
    expand,
    collapse,
  });

  useKeyDown({ key: 'Escape', enabled: state === 'actions', handler: collapse });

  return {
    state,
    elements,
    mascotRef,
    notice              : flow.notice,
    selection           : actions.selection,
    phase               : actions.phase,
    choose              : actions.choose,
    close               : collapse,
    onMascotStateChange : setMascot,
  };
};

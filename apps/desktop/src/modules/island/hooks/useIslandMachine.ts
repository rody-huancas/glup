import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { areaKindFor, checkInvariants, describeEvent, INITIAL_MACHINE, islandReducer } from '@/modules/island/utils/islandMachine';
import { logIsland } from '@/modules/island/utils/islandLog';

// The island's single source of truth: a pure reducer fed with typed events. In dev every transition is
// logged with the previous phase, the event, the new phase and the region it asks for.
export const useIslandMachine = () => {
  const [machine, dispatch] = useReducer(islandReducer, INITIAL_MACHINE);
  const lastEvent           = useRef<IslandEvent | null>(null);
  const previous            = useRef<IslandMachine>(INITIAL_MACHINE);

  const send = useCallback((event: IslandEvent) => {
    lastEvent.current = event;
    dispatch(event);
  }, []);

  useEffect(() => {
    const before = previous.current;
    const event  = lastEvent.current;
    previous.current = machine;

    if (event && before.moving !== machine.moving) logIsland(`${describeEvent(event)}: arrastrando=${machine.moving}`);
    if (!event || (before.phase === machine.phase && before.pinned === machine.pinned && before.resets === machine.resets)) return;

    logIsland(`${before.phase} --${describeEvent(event)}--> ${machine.phase}${machine.pinned ? ' (fijada)' : ''} · región ${areaKindFor(machine.phase)}`);
    checkInvariants(machine).forEach((broken) => logIsland(`invariante rota: ${broken}`));
  }, [machine]);

  return { machine, send };
};

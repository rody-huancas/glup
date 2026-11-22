import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import type { IslandPhase } from '@/modules/island/types/islandPhase';
import type { IslandState } from '@/modules/island/types/islandState';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import type { IslandAreaKind } from '@/modules/island/utils/islandArea';

export const INITIAL_MACHINE: IslandMachine = {
  phase      : 'collapsed',
  pinned     : false,
  farewell   : false,
  inside     : false,
  locked     : false,
  fullscreen : false,
  trayHidden : false,
  notice     : null,
  resets     : 0,
  holds      : [],
};

const OPEN_PHASES: IslandPhase[]   = ['expanding', 'expanded'];
const CLOSED_PHASES: IslandPhase[] = ['collapsed', 'collapsing', 'notice'];

const isHiddenBy = (machine: IslandMachine): boolean => machine.fullscreen || machine.trayHidden;

// Leaving the hidden state always lands on a clean pill.
const revealed = (machine: IslandMachine): IslandMachine =>
  isHiddenBy(machine) ? machine : { ...machine, phase: 'collapsed', pinned: false, notice: null, locked: false, resets: machine.resets + 1 };

const hidden = (machine: IslandMachine): IslandMachine => ({ ...machine, phase: 'hidden', pinned: false, notice: null });

const step = (machine: IslandMachine, event: IslandEvent): IslandMachine => {
  const { phase } = machine;

  switch (event.type) {
    case 'pointer':
      return { ...machine, inside: event.inside, locked: event.inside && machine.locked };

    case 'expand':
      if (phase === 'hidden') return machine;
      if (OPEN_PHASES.includes(phase)) return { ...machine, pinned: machine.pinned || event.pin };
      return { ...machine, phase: 'expanding', pinned: event.pin, notice: null };

    case 'collapse':
      if (!OPEN_PHASES.includes(phase)) return { ...machine, pinned: false };
      return { ...machine, phase: 'collapsing', pinned: false, farewell: event.farewell, locked: machine.inside };

    // A late "settled" from an animation that was replaced is ignored.
    case 'settled':
      if (event.phase === 'expanded' && phase === 'expanding') return { ...machine, phase: 'expanded' };
      if (event.phase === 'collapsed' && phase === 'collapsing') return { ...machine, phase: 'collapsed' };
      return machine;

    case 'pin-toggled':
      return OPEN_PHASES.includes(phase) ? { ...machine, pinned: !machine.pinned } : machine;

    // Only the resting pill widens; a new result while one is showing just replaces its text.
    case 'notice':
      return phase === 'collapsed' || phase === 'notice' ? { ...machine, phase: 'notice', notice: event.notice } : machine;

    case 'notice-ended':
      return phase === 'notice' ? { ...machine, phase: 'collapsed', notice: null } : machine;

    case 'fullscreen': {
      const next = { ...machine, fullscreen: event.on };
      if (isHiddenBy(next)) return hidden(next);
      return phase === 'hidden' ? revealed(next) : next;
    }

    case 'tray': {
      const next = { ...machine, trayHidden: event.hidden };
      if (isHiddenBy(next)) return hidden(next);
      return revealed(next);
    }

    case 'reset':
      return isHiddenBy(machine) ? hidden(machine) : revealed(machine);

    case 'holds':
      return { ...machine, holds: event.holds };
  }
};

// Keeps the invariants whatever the event: hidden only for fullscreen or the tray, a notice only on the
// wide pill, pinned only while open.
const normalize = (machine: IslandMachine): IslandMachine => {
  if (isHiddenBy(machine) && machine.phase !== 'hidden') return hidden(machine);
  if (!isHiddenBy(machine) && machine.phase === 'hidden') return revealed(machine);

  return {
    ...machine,
    notice : machine.phase === 'notice' ? machine.notice : null,
    pinned : OPEN_PHASES.includes(machine.phase) && machine.pinned,
  };
};

export const islandReducer = (machine: IslandMachine, event: IslandEvent): IslandMachine => normalize(step(machine, event));

// What the rest of the island (timers, hover, focus) sees.
export const toIslandState = (phase: IslandPhase): IslandState => {
  if (phase === 'hidden') return 'hidden';
  return CLOSED_PHASES.includes(phase) ? 'collapsed' : 'expanded';
};

// The region each phase needs; while opening the whole frame (elastic overshoot), while closing the
// panel until it has shrunk.
export const areaKindFor = (phase: IslandPhase): IslandAreaKind => {
  if (phase === 'expanding') return 'frame';
  if (phase === 'expanded' || phase === 'collapsing') return 'expanded';
  if (phase === 'notice') return 'notice';
  return 'collapsed';
};

// Phases where nothing is moving, so the watchdog can compare the region with the real window.
export const isSettledPhase = (phase: IslandPhase): boolean => phase === 'collapsed' || phase === 'expanded';

export const hoverEnabled = (machine: IslandMachine): boolean => machine.inside && !machine.locked;

// Leaving the panel does not close it while pinned or while the person is in the middle of something.
// Glup eating or working no longer counts: tasks go on in the background with the pill's progress.
export const isHeldOpen = (machine: IslandMachine): boolean => machine.pinned || machine.holds.length > 0;

// Every broken rule, empty when all hold (checked in tests and logged in dev).
export const checkInvariants = (machine: IslandMachine): string[] => {
  const broken: string[] = [];
  const pill             = getIslandArea('collapsed');
  const area             = getIslandArea(areaKindFor(machine.phase));

  if ((machine.phase === 'hidden') !== isHiddenBy(machine)) broken.push('hidden sin pantalla completa ni bandeja (o al revés)');
  if (machine.phase !== 'hidden' && (area.width < pill.width || area.height < pill.height)) broken.push('región menor que la pastilla');
  if ((machine.notice !== null) !== (machine.phase === 'notice')) broken.push('aviso fuera de la pastilla ancha');
  if (machine.pinned && !OPEN_PHASES.includes(machine.phase)) broken.push('fijada estando cerrada');

  return broken;
};

export const describeEvent = (event: IslandEvent): string => {
  if (event.type === 'pointer') return `pointer(${event.inside ? 'dentro' : 'fuera'})`;
  if (event.type === 'expand') return `expand(${event.pin ? 'fijada' : 'hover'})`;
  if (event.type === 'collapse') return `collapse(${event.farewell ? 'adiós' : 'salida'})`;
  if (event.type === 'settled') return `settled(${event.phase})`;
  if (event.type === 'fullscreen') return `fullscreen(${event.on})`;
  if (event.type === 'tray') return `tray(${event.hidden ? 'oculta' : 'visible'})`;
  if (event.type === 'holds') return `holds(${event.holds.join(', ') || 'ninguno'})`;
  return event.type;
};

import type { DockArea } from '@/modules/dock/types/dockArea';
import type { IslandRest } from '@/modules/dock/types/islandRest';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import type { IslandPhase } from '@/modules/island/types/islandPhase';
import type { IslandState } from '@/modules/island/types/islandState';
import { getIslandArea } from '@/modules/island/utils/islandArea';

export const INITIAL_MACHINE: IslandMachine = {
  phase      : 'collapsed',
  pinned     : false,
  farewell   : false,
  inside     : false,
  locked     : false,
  fullscreen : false,
  trayHidden : false,
  capturing  : false,
  moving     : false,
  rest       : 'pill',
  notice     : null,
  resets     : 0,
  holds      : [],
  clicked    : false,
};

const OPEN_PHASES: IslandPhase[]   = ['expanding', 'expanded'];
const CLOSED_PHASES: IslandPhase[] = ['collapsed', 'collapsing', 'notice'];

const isHiddenBy = (machine: IslandMachine): boolean => machine.fullscreen || machine.trayHidden || machine.capturing;

// Leaving the hidden state always lands on a clean pill.
const revealed = (machine: IslandMachine): IslandMachine =>
  isHiddenBy(machine) ? machine : { ...machine, phase: 'collapsed', pinned: false, notice: null, locked: false, moving: false, resets: machine.resets + 1 };

const hidden = (machine: IslandMachine): IslandMachine => ({ ...machine, phase: 'hidden', pinned: false, notice: null, moving: false });

const step = (machine: IslandMachine, event: IslandEvent): IslandMachine => {
  const { phase } = machine;

  switch (event.type) {
    case 'pointer':
      return { ...machine, inside: event.inside, locked: event.inside && machine.locked };

    case 'expand':
      if (phase === 'hidden' || machine.moving) return machine;
      if (OPEN_PHASES.includes(phase)) return { ...machine, pinned: machine.pinned || event.pin };
      return { ...machine, phase: 'expanding', pinned: event.pin, clicked: event.click === true, notice: null };

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

    // Only the resting pill (or bubble, with its tab) widens; a new result while one is showing just
    // replaces its text. While it is dragged, or hidden at rest (there is nothing on screen), nothing
    // widens: the result is told by its toast or its Windows notification.
    case 'notice':
      if (machine.moving || machine.rest === 'hidden') return machine;
      return phase === 'collapsed' || phase === 'notice' ? { ...machine, phase: 'notice', notice: event.notice } : machine;

    // Only the resting pill or bubble (or its notice, which gives way) can be dragged, to another edge or
    // anywhere on the screen; while it goes, nothing opens it.
    case 'moving':
      if (!event.on) return { ...machine, moving: false };
      if ((phase !== 'collapsed' && phase !== 'notice') || machine.rest === 'hidden') return machine;
      return { ...machine, phase: 'collapsed', notice: null, moving: true };

    // How it rests when closed: the pill, hidden (modo oculto) or the bubble. A live notice and a drag
    // belong to the form it had, so changing it drops them; the panel, if open, stays open.
    case 'rest':
      if (event.rest === machine.rest) return machine;
      return { ...machine, rest: event.rest, moving: false, notice: null, phase: phase === 'notice' ? 'collapsed' : phase };

    // A click outside the window (it lost the focus): the open bubble closes, as it was opened with a
    // click. Not while the person is in the middle of something (a native dialog takes the focus too).
    // Opened from the Explorer it closes too, unless pinned; a step half done does not keep it (its
    // files wait in Inicio), a dialog, a file dragged over it or a full screen do.
    case 'outside': {
      if (!OPEN_PHASES.includes(phase)) return machine;
      const bubble  = machine.rest === 'bubble' && machine.holds.length === 0;
      const clicked = machine.clicked && !machine.pinned && machine.holds.every((hold) => hold === 'step');
      if (!bubble && !clicked) return machine;
      return { ...machine, phase: 'collapsing', pinned: false, farewell: false, locked: machine.inside };
    }

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

    // "Copiar texto de la pantalla": out of the still while the zone is chosen, a clean pill after.
    case 'capture': {
      const next = { ...machine, capturing: event.on };
      if (isHiddenBy(next)) return hidden(next);
      return phase === 'hidden' ? revealed(next) : next;
    }

    case 'reset':
      return isHiddenBy(machine) ? hidden(machine) : revealed(machine);

    case 'holds':
      return { ...machine, holds: event.holds };
  }
};

// Keeps the invariants whatever the event: hidden only for fullscreen, the tray or a capture of the
// screen, a notice only on the wide pill, pinned only while open.
const normalize = (machine: IslandMachine): IslandMachine => {
  if (isHiddenBy(machine) && machine.phase !== 'hidden') return hidden(machine);
  if (!isHiddenBy(machine) && machine.phase === 'hidden') return revealed(machine);

  return {
    ...machine,
    notice  : machine.phase === 'notice' ? machine.notice : null,
    pinned  : OPEN_PHASES.includes(machine.phase) && machine.pinned,
    clicked : OPEN_PHASES.includes(machine.phase) && machine.clicked,
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
export const areaKindFor = (phase: IslandPhase): DockArea => {
  if (phase === 'expanding') return 'frame';
  if (phase === 'expanded' || phase === 'collapsing') return 'expanded';
  if (phase === 'notice') return 'notice';
  return 'collapsed';
};

// Phases where nothing is moving, so the watchdog can compare the region with the real window.
export const isSettledPhase = (phase: IslandPhase): boolean => phase === 'collapsed' || phase === 'expanded';

export const hoverEnabled = (machine: IslandMachine): boolean => machine.inside && !machine.locked && !machine.moving;

// The pill opens when the cursor rests on it; the bubble only reacts (it grows a little) and opens with a
// click, so dragging it never opens it.
export const hoverOpens = (machine: IslandMachine): boolean => hoverEnabled(machine) && machine.rest !== 'bubble';

// Leaving the panel does not close it while pinned or while the person is in the middle of something.
// Glup eating or working no longer counts: tasks go on in the background with the pill's progress.
export const isHeldOpen = (machine: IslandMachine): boolean => machine.pinned || machine.holds.length > 0;

// The cursor leaving the panel closes it, except held open, on the bubble and opened from the Explorer
// (opened with a click, they close with a click outside, Esc, its shortcut or a click on Glup).
export const closesOnLeave = (machine: IslandMachine): boolean => !isHeldOpen(machine) && machine.rest !== 'bubble' && !machine.clicked;

// It listens for a click outside (the window losing the focus): the bubble, and opened from the Explorer.
export const closesOnOutside = (machine: IslandMachine): boolean => machine.rest === 'bubble' || machine.clicked;

// Every broken rule, empty when all hold (checked in tests and logged in dev).
export const checkInvariants = (machine: IslandMachine): string[] => {
  const broken: string[] = [];
  const pill             = getIslandArea('collapsed');
  const area             = getIslandArea(areaKindFor(machine.phase));

  if ((machine.phase === 'hidden') !== isHiddenBy(machine)) broken.push('hidden sin pantalla completa, bandeja ni captura (o al revés)');
  if (machine.phase !== 'hidden' && (area.width < pill.width || area.height < pill.height)) broken.push('región menor que la pastilla');
  if ((machine.notice !== null) !== (machine.phase === 'notice')) broken.push('aviso fuera de la pastilla ancha');
  if (machine.pinned && !OPEN_PHASES.includes(machine.phase)) broken.push('fijada estando cerrada');
  if (machine.moving && machine.phase !== 'collapsed') broken.push('arrastrada sin estar recogida');
  if (machine.rest === 'hidden' && (machine.notice !== null || machine.moving)) broken.push('aviso o arrastre sin pastilla (oculta)');

  return broken;
};

const REST_NAMES: Record<IslandRest, string> = { pill: 'pastilla', hidden: 'oculta', bubble: 'burbuja' };

export const describeEvent = (event: IslandEvent): string => {
  if (event.type === 'pointer') return `pointer(${event.inside ? 'dentro' : 'fuera'})`;
  if (event.type === 'expand') return `expand(${event.pin ? 'fijada' : event.click ? 'clic desde afuera' : 'hover'})`;
  if (event.type === 'collapse') return `collapse(${event.farewell ? 'adiós' : 'salida'})`;
  if (event.type === 'settled') return `settled(${event.phase})`;
  if (event.type === 'fullscreen') return `fullscreen(${event.on})`;
  if (event.type === 'tray') return `tray(${event.hidden ? 'oculta' : 'visible'})`;
  if (event.type === 'capture') return `capture(${event.on ? 'eligiendo zona' : 'terminó'})`;
  if (event.type === 'holds') return `holds(${event.holds.join(', ') || 'ninguno'})`;
  if (event.type === 'moving') return `moving(${event.on ? 'arrastrando' : 'soltada'})`;
  if (event.type === 'rest') return `rest(${REST_NAMES[event.rest]})`;
  return event.type;
};

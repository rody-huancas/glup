import type { IslandRest } from '@/modules/dock/types/islandRest';
import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import type { HoldReason } from '@/modules/island/types/holdReason';
import type { IslandPhase } from '@/modules/island/types/islandPhase';

export interface IslandMachine {
  phase      : IslandPhase;
  pinned     : boolean;
  // The last close was on purpose (Recoger, Esc): Glup waves goodbye.
  farewell   : boolean;
  inside     : boolean;
  // Closed with the cursor still over it: hover stays off until the cursor leaves.
  locked     : boolean;
  fullscreen : boolean;
  trayHidden : boolean;
  // "Copiar texto de la pantalla": a zone of the screen is being chosen.
  capturing  : boolean;
  // Being dragged to another edge, corner, spot or screen: it does not open (not even on hover) until
  // dropped.
  moving     : boolean;
  // How it rests when closed: the pill, hidden (modo oculto, nothing on screen; the cursor against its
  // edge, its shortcut or the tray bring the panel out) or the floating bubble. Collapsed is still its
  // resting phase in all three.
  rest       : IslandRest;
  notice     : IslandNotice | null;
  // Bumped by every hard reset (tray, watchdog), so the view snaps back to a clean pill.
  resets     : number;
  // What keeps it open besides the pin; a running task never does (the pill shows its progress).
  holds      : HoldReason[];
  // Opened like a click on the bubble, from outside (files from the Explorer with a step): it does not
  // close when the cursor leaves (it never was there), it closes with a click outside, Esc or its
  // shortcut. Not pinned unless the person pins it.
  clicked    : boolean;
}

export type IslandEvent =
  | { type: 'pointer'; inside: boolean }
  | { type: 'expand'; pin: boolean; click?: boolean }
  | { type: 'collapse'; farewell: boolean }
  | { type: 'settled'; phase: 'expanded' | 'collapsed' }
  | { type: 'pin-toggled' }
  | { type: 'notice'; notice: IslandNotice }
  | { type: 'notice-ended' }
  | { type: 'fullscreen'; on: boolean }
  | { type: 'tray'; hidden: boolean }
  | { type: 'capture'; on: boolean }
  | { type: 'moving'; on: boolean }
  | { type: 'rest'; rest: IslandRest }
  | { type: 'outside' }
  | { type: 'reset' }
  | { type: 'holds'; holds: HoldReason[] };

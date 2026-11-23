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
  notice     : IslandNotice | null;
  // Bumped by every hard reset (tray, watchdog), so the view snaps back to a clean pill.
  resets     : number;
  // What keeps it open besides the pin; a running task never does (the pill shows its progress).
  holds      : HoldReason[];
}

export type IslandEvent =
  | { type: 'pointer'; inside: boolean }
  | { type: 'expand'; pin: boolean }
  | { type: 'collapse'; farewell: boolean }
  | { type: 'settled'; phase: 'expanded' | 'collapsed' }
  | { type: 'pin-toggled' }
  | { type: 'notice'; notice: IslandNotice }
  | { type: 'notice-ended' }
  | { type: 'fullscreen'; on: boolean }
  | { type: 'tray'; hidden: boolean }
  | { type: 'capture'; on: boolean }
  | { type: 'reset' }
  | { type: 'holds'; holds: HoldReason[] };

import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
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
  notice     : IslandNotice | null;
  // Bumped by every hard reset (tray, watchdog), so the view snaps back to a clean pill.
  resets     : number;
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
  | { type: 'reset' };

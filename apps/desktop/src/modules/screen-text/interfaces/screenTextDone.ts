import type { ScreenTextOutcome } from '@/modules/screen-text/types/screenTextOutcome';

// What Rust says once the zone was read (screen-text-done).
export interface ScreenTextDone {
  outcome : ScreenTextOutcome;
  words   : number;
  // Its history line, when the history keeps what is copied from the screen.
  entryId : string | null;
}

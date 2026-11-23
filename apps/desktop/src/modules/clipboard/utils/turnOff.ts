import { CLIPBOARD_OFF_TEXTS } from '@/modules/clipboard/constants/texts';
import type { TurnOffOutcome } from '@/modules/clipboard/interfaces/turnOffOutcome';
import type { TurnOffChoice } from '@/modules/clipboard/types/turnOffChoice';

// Turning it off with something kept asks what to do with it; with nothing kept, it just turns off.
export const askBeforeTurningOff = (count: number): boolean => count > 0;

// "Son 12 elementos. Se quedan solo en tu PC."
export const turnOffBody = (count: number): string => CLIPBOARD_OFF_TEXTS.body(count);

// What each way out of the dialog does: only its two buttons turn it off; leaving it (Esc, outside)
// changes nothing.
export const turnOffOutcome = (choice: TurnOffChoice): TurnOffOutcome => ({
  enabled   : choice === 'dismiss',
  deleteAll : choice === 'delete',
});

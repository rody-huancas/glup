import type { ScreenTextDone } from '@/modules/screen-text/interfaces/screenTextDone';
import { SCREEN_TEXT_DONE_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The island hears when the zone was read, to tell it with a short notice.
export const useScreenTextDone = (onDone: (done: ScreenTextDone) => void) => {
  useTauriEvent<ScreenTextDone>(SCREEN_TEXT_DONE_EVENT, onDone);
};

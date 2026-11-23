import type { IslandNotice } from '@/modules/island/interfaces/islandNotice';
import { SCREEN_TEXT_TEXTS } from '@/modules/screen-text/constants/texts';
import type { ScreenTextDone } from '@/modules/screen-text/interfaces/screenTextDone';

// The short notice of the island: Glup happy with the words copied (and "Ver" when it is in the
// history), or confused when there was nothing.
export const screenTextNotice = ({ outcome, words, entryId }: ScreenTextDone): IslandNotice => {
  if (outcome === 'copied') return { message: SCREEN_TEXT_TEXTS.copied(words), tone: 'success', entryId };
  if (outcome === 'empty') return { message: SCREEN_TEXT_TEXTS.empty, tone: 'failed' };
  return { message: SCREEN_TEXT_TEXTS.failed, tone: 'failed' };
};

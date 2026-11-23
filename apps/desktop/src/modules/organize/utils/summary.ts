import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import type { EditSummary } from '@/modules/organize/interfaces/editSummary';

// "12 páginas · 2 quitadas · 3 giradas"; only what changed after the page count.
export const summaryLine = ({ kept, removed, rotated }: EditSummary): string =>
  [
    ORGANIZE_TEXTS.pages(kept),
    removed > 0 ? ORGANIZE_TEXTS.removedN(removed) : null,
    rotated > 0 ? ORGANIZE_TEXTS.rotatedN(rotated) : null,
  ]
    .filter(Boolean)
    .join(' · ');

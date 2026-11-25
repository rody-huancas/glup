import type { ScanMode } from '@/modules/scan/types/scanMode';
import type { ScanPaper } from '@/modules/scan/types/scanPaper';

export const SCAN_MODES: ScanMode[]   = ['color', 'gray', 'bw'];
export const SCAN_PAPERS: ScanPaper[] = ['auto', 'a4', 'letter'];

// The photo on screen and in the strip (Rust makes it upright and this size at most).
export const PHOTO_SIZE = 1400;

// One arrow press moves a corner this share of the photo (Shift: ten times more).
export const CORNER_STEP     = 0.004;
export const CORNER_BIG_STEP = 0.04;

// The magnifier while a corner is dragged: its size, how much it enlarges and how far from the corner.
export const LOUPE = { size: 112, zoom: 3, gap: 28 };

// The result is asked for again this long after the last change.
export const PREVIEW_DELAY = 300;

// Photos opened at the same time.
export const OPEN_AT_ONCE = 2;

import type { Quad } from '@/modules/scan/types/quad';

// The whole photo, until (or unless) a sheet is found in it.
export const FULL_FRAME: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

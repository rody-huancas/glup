import type { HeifSupport } from '@/modules/photos/interfaces/heifSupport';
import { pathNeedsPhotoTool } from '@/modules/photos/utils/photos';
import type { ScanPageRequest } from '@/modules/scan/interfaces/scanPageRequest';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import type { ScanRotation } from '@/modules/scan/types/scanRotation';
import { isConvexQuad } from '@/modules/scan/utils/corners';

interface MoveSheetParams {
  sheets : ScanSheet[];
  from   : number;
  to     : number;
}

// Dragged (or moved with Alt and the arrows) to another place; out of range, as it was.
export const moveSheet = ({ sheets, from, to }: MoveSheetParams): ScanSheet[] => {
  if (from === to || from < 0 || to < 0 || from >= sheets.length || to >= sheets.length) return sheets;
  const next    = [...sheets];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

// A quarter turn to one side.
export const turnSheet = (rotation: ScanRotation, direction: 'left' | 'right'): ScanRotation =>
  (((rotation + (direction === 'right' ? 90 : 270)) % 360) as ScanRotation);

// After removing one, the one that took its place (or the one before, at the end).
export const nextAfterRemoving = (sheets: ScanSheet[], id: string): string | null => {
  const index = sheets.findIndex((sheet) => sheet.id === id);
  const rest  = sheets.filter((sheet) => sheet.id !== id);
  if (rest.length === 0) return null;
  return rest[Math.min(Math.max(index, 0), rest.length - 1)].id;
};

export const sheetIsUsable = (sheet: ScanSheet): boolean => sheet.status === 'ready' && isConvexQuad(sheet.corners, sheet.width, sheet.height);

// Saved once every photo was opened and at least one is a good sheet; the photos that could not be
// opened are left out, a sheet with crossed corners is not.
export const canSaveSheets = (sheets: ScanSheet[]): boolean => {
  const ready = sheets.filter((sheet) => sheet.status === 'ready');
  return !sheets.some((sheet) => sheet.status === 'loading') && ready.length > 0 && ready.every(sheetIsUsable);
};

// The photos that could not be opened because they need FFmpeg (HEIC or AVIF this Windows cannot open):
// once it is learned, these are opened again.
export const sheetsNeedingTool = (sheets: ScanSheet[], support: HeifSupport | null): ScanSheet[] =>
  support ? sheets.filter((sheet) => sheet.status === 'failed' && pathNeedsPhotoTool(sheet.path, support)) : [];

// What Rust needs, in the order on screen.
export const pageRequests = (sheets: ScanSheet[]): ScanPageRequest[] =>
  sheets.filter((sheet) => sheet.status === 'ready').map((sheet) => ({ path: sheet.path, corners: sheet.corners, rotation: sheet.rotation }));

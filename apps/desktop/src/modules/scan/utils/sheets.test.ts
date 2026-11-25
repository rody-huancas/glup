import { describe, expect, it } from 'vitest';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import { canSaveSheets, moveSheet, nextAfterRemoving, pageRequests, sheetsNeedingTool, turnSheet } from '@/modules/scan/utils/sheets';

const sheet = (id: string, fields: Partial<ScanSheet> = {}): ScanSheet => ({
  id, path: `C:/fotos/${id}.jpg`, name: `${id}.jpg`, status: 'ready', error: null, width: 1200, height: 1600,
  corners: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }], found: true, rotation: 0, url: null, ...fields,
});

describe('the sheets of a scan', () => {
  it('change order, turn and leave', () => {
    const list = [sheet('a'), sheet('b'), sheet('c')];
    expect(moveSheet({ sheets: list, from: 0, to: 2 }).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(moveSheet({ sheets: list, from: 0, to: 7 })).toBe(list);
    expect(turnSheet(0, 'right')).toBe(90);
    expect(turnSheet(0, 'left')).toBe(270);
    expect(turnSheet(270, 'right')).toBe(0);
    expect(nextAfterRemoving(list, 'b')).toBe('c');
    expect(nextAfterRemoving(list, 'c')).toBe('b');
    expect(nextAfterRemoving([sheet('a')], 'a')).toBeNull();
  });

  it('save once the photos are open, without the ones that failed, never with crossed corners', () => {
    expect(canSaveSheets([sheet('a'), sheet('b', { status: 'loading' })])).toBe(false);
    expect(canSaveSheets([sheet('a'), sheet('b', { status: 'failed' })])).toBe(true);
    expect(canSaveSheets([sheet('b', { status: 'failed' })])).toBe(false);
    expect(canSaveSheets([sheet('a', { corners: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }] })])).toBe(false);

    const pages = pageRequests([sheet('a', { rotation: 90 }), sheet('b', { status: 'failed' })]);
    expect(pages).toEqual([{ path: 'C:/fotos/a.jpg', corners: sheet('a').corners, rotation: 90 }]);
  });

  it('know which failed photos wait for FFmpeg', () => {
    const list    = [sheet('a'), sheet('b', { status: 'failed', path: 'C:/fotos/IMG_2.HEIC' }), sheet('c', { status: 'failed' }), sheet('d', { path: 'C:/fotos/x.heic' })];
    const without = { heic: false, avif: false, ffmpeg: false };
    expect(sheetsNeedingTool(list, without).map((item) => item.id)).toEqual(['b']);
    expect(sheetsNeedingTool(list, { ...without, ffmpeg: true })).toEqual([]);
    expect(sheetsNeedingTool(list, null)).toEqual([]);
  });
});

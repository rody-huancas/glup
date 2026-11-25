import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { HeifSupport } from '@/modules/photos/interfaces/heifSupport';
import { getHeifSupport } from '@/modules/photos/services/photos';
import { FULL_FRAME } from '@/modules/scan/constants/frame';
import { OPEN_AT_ONCE, PHOTO_SIZE } from '@/modules/scan/constants/scan';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import type { ScanTarget } from '@/modules/scan/interfaces/scanTarget';
import { closeScan, getScanPhoto, openScanPhoto, scanDocument } from '@/modules/scan/services/scan';
import type { Quad } from '@/modules/scan/types/quad';
import type { ScanMode } from '@/modules/scan/types/scanMode';
import type { ScanPaper } from '@/modules/scan/types/scanPaper';
import { canSaveSheets, moveSheet, nextAfterRemoving, pageRequests, sheetsNeedingTool, turnSheet } from '@/modules/scan/utils/sheets';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { enqueueTask } from '@/modules/tasks/store/taskStore';
import { getTextSupport } from '@/modules/text/services/text';

interface UseScanEditorParams {
  target : ScanTarget;
  onExit : () => void;
}

const loading = (path: string, index: number): ScanSheet => ({
  id: `${index}-${path}`, path, name: getFileName(path), status: 'loading', error: null, width: 4, height: 3, corners: FULL_FRAME, found: false, rotation: 0, url: null,
});

// Every photo opened by Rust (a couple at a time) with the sheet it found; the corners, the order,
// the turns and the options of the PDF; and saving it as a task. A HEIC or AVIF this Windows cannot
// open waits for FFmpeg: once it is learned, those photos are opened again.
export const useScanEditor = ({ target, onExit }: UseScanEditorParams) => {
  const [sheets, setSheets]         = useState<ScanSheet[]>(() => target.paths.map(loading));
  const [currentId, setCurrentId]   = useState<string | null>(() => `0-${target.paths[0]}`);
  const [mode, setMode]             = useState<ScanMode>('color');
  const [paper, setPaper]           = useState<ScanPaper>('auto');
  const [searchable, setSearchable] = useState(false);
  const [reader, setReader]         = useState(false);
  const [changed, setChanged]       = useState(false);
  const [support, setSupport]       = useState<HeifSupport | null>(null);
  const urls                        = useRef<string[]>([]);
  const saved                       = useRef(false);

  const update = useCallback((id: string, change: Partial<ScanSheet>) => {
    setSheets((current) => current.map((sheet) => (sheet.id === id ? { ...sheet, ...change } : sheet)));
  }, []);

  const open = useCallback(async (sheet: ScanSheet) => {
    try {
      const photo = await openScanPhoto(sheet.path);
      const url   = sheet.url ?? await getScanPhoto({ path: sheet.path, size: PHOTO_SIZE });
      if (!sheet.url) urls.current.push(url);
      update(sheet.id, { status: 'ready', width: photo.width, height: photo.height, corners: photo.corners, found: photo.found, url });
    } catch (error) {
      update(sheet.id, { status: 'failed', error: typeof error === 'string' ? error : SCAN_TEXTS.failed });
    }
  }, [update]);

  // A couple at a time, in order, so the first ones are ready soon.
  useEffect(() => {
    let active  = true;
    const queue = target.paths.map(loading);
    const next  = async (): Promise<void> => {
      const sheet = queue.shift();
      if (!sheet || !active) return;
      await open(sheet);
      return next();
    };
    void Promise.all(Array.from({ length: OPEN_AT_ONCE }, next));
    return () => {
      active = false;
    };
  }, [target, open]);

  useEffect(() => {
    void getHeifSupport().then(setSupport).catch(() => undefined);
  }, []);

  useEffect(() => {
    void getTextSupport()
      .then((support) => {
        const available = support.supported && support.language !== null;
        setReader(available);
        setSearchable(available);
      })
      .catch(() => undefined);
  }, []);

  // The photos kept by Rust and the webview go when the screen does (Rust lets them go after saving too).
  useEffect(() => () => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    if (!saved.current) void closeScan().catch(() => undefined);
  }, []);

  const current = sheets.find((sheet) => sheet.id === currentId) ?? sheets[0] ?? null;

  const changeCorners = useCallback((id: string, corners: Quad) => {
    setChanged(true);
    update(id, { corners });
  }, [update]);

  const detectAgain = useCallback((id: string) => {
    const sheet = sheets.find((item) => item.id === id);
    if (!sheet || sheet.status === 'loading') return;
    setChanged(true);
    update(id, { status: 'loading' });
    void open(sheet);
  }, [sheets, open, update]);

  const turn = useCallback((id: string, direction: 'left' | 'right') => {
    setChanged(true);
    setSheets((list) => list.map((sheet) => (sheet.id === id ? { ...sheet, rotation: turnSheet(sheet.rotation, direction) } : sheet)));
  }, []);

  const remove = useCallback((id: string) => {
    setChanged(true);
    setCurrentId(nextAfterRemoving(sheets, id));
    setSheets((list) => list.filter((sheet) => sheet.id !== id));
  }, [sheets]);

  const move = useCallback((from: number, to: number) => {
    setChanged(true);
    setSheets((list) => moveSheet({ sheets: list, from, to }));
  }, []);

  const canSave = useMemo(() => canSaveSheets(sheets), [sheets]);

  // Only once every photo was tried, so the question comes once.
  const waiting   = sheets.some((sheet) => sheet.status === 'loading');
  const needsTool = !waiting && sheetsNeedingTool(sheets, support).length > 0;

  // FFmpeg is here now: the photos that waited for it are opened again (their corners found then).
  const toolLearned = useCallback(() => {
    void getHeifSupport()
      .catch(() => ({ heic: false, avif: false, ffmpeg: true }))
      .then((next) => {
        const again = sheetsNeedingTool(sheets, support ?? { ...next, ffmpeg: false });
        setSupport(next);
        again.forEach((sheet) => {
          update(sheet.id, { status: 'loading', error: null });
          void open(sheet);
        });
      });
  }, [sheets, support, open, update]);

  const save = useCallback((destination: SaveDestination) => {
    if (!canSave) return;
    const pages = pageRequests(sheets);
    saved.current = true;
    enqueueTask({
      title     : SCAN_TEXTS.taskTitle(pages.length),
      actionId  : 'scan',
      type      : 'image',
      fileCount : pages.length,
      owner     : 'home',
      run       : ({ taskId }) => scanDocument({ pages, mode, paper, searchable: searchable && reader, destination, taskId }),
    });
    onExit();
  }, [canSave, sheets, mode, paper, searchable, reader, onExit]);

  return {
    sheets, current, select: setCurrentId, mode, setMode, paper, setPaper, searchable, setSearchable, reader,
    changed, canSave, changeCorners, detectAgain, turn, remove, move, save, needsTool, toolLearned,
  };
};

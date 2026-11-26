import autoFolders from '@/demo/fixtures/autoFolders.json';
import clips from '@/demo/fixtures/clips.json';
import duplicates from '@/demo/fixtures/duplicates.json';
import files from '@/demo/fixtures/files.json';
import history from '@/demo/fixtures/history.json';
import settings from '@/demo/fixtures/settings.json';
import space from '@/demo/fixtures/space.json';
import subtitles from '@/demo/fixtures/subtitles.json';
import { islandFrame } from '@/demo/frame';
import { flatSheet, landscape, paint, sheetOnTable } from '@/demo/paint';
import { emitDemo } from '@/demo/bus';
import { scene, screen, state } from '@/demo/scene';
import { ACTION_PROGRESS_EVENT } from '@/shared/constants/events';
import { DEFAULT_SETTINGS } from '@/modules/settings/constants/saveLocation';

type Handler = (args: Record<string, unknown>) => unknown;

const MB = 1024 * 1024;
const GB = 1024 * MB;

interface When {
  daysAgo     : number;
  at?         : string;
  minutesAgo? : number;
}

// Today's lines a while ago (never in the future); the other days at their hour.
const dateOf = ({ daysAgo, at, minutesAgo }: When): string => {
  if (minutesAgo !== undefined) return new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const [hours, minutes] = (at ?? '12:00').split(':').map(Number);
  const date             = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const entries = history.map((entry, index) => ({ ...entry, id: `demo-${index}`, date: dateOf(entry) }));

let view = { ...DEFAULT_SETTINGS, ...settings };

// The task of «?screen=task» (working) and «?screen=result» (done).
const working = { id: 'demo-task', actionId: 'compress', progress: { taskId: 'demo-task', current: 7, total: 12, name: 'Vacaciones Cusco 021.heic', active: 2, stage: 'working' }, report: null, error: null, finished: false, summary: null };
const report  = {
  actionId: 'compress', outputSize: null, output: null, total: 12, cancelled: false, bundled: false, outputIsFolder: false, pagesDone: null, pagesTotal: null,
  outcomes: Array.from({ length: 12 }, (_, index) => ({ source: `C:\\Users\\Ana\\Pictures\\Vacaciones Cusco 0${10 + index}.jpg`, output: `C:\\Users\\Ana\\Pictures\\Vacaciones Cusco 0${10 + index}-comprimida.jpg`, sizeBefore: 4.1 * MB, sizeAfter: 1.2 * MB, error: null, unchanged: null, note: null })),
};
const done = { ...working, progress: null, report, finished: true };

// Subtítulos and Escanear documento open as from the Explorer's right click, with their files.
const explorer = (): unknown[] => {
  if (screen === 'subtitles') return [{ tool: 'subtitles', paths: files.filter((file) => file.kind === 'video').map((file) => file.path) }];
  if (screen === 'scan') return [{ tool: 'scan-document', paths: files.filter((file) => file.name.startsWith('Hoja')).map((file) => file.path) }];
  return [];
};

// The screen the island lives on: a full HD one, or the smaller desktop of the pictures.
const SCREEN = scene === 'desktop' ? { width: 1600, height: 900 } : { width: 1920, height: 1080 };
const TASKBAR = 48;

const wait = (ms: number) => new Promise((done) => window.setTimeout(done, ms));

// An action on dropped files (the GIF): a few steps of progress, then each file done and lighter.
const runAction = async ({ request }: Record<string, unknown>) => {
  const { actionId, paths, taskId } = request as { actionId: string; paths: string[]; taskId: string | null };
  const total = paths.length;
  for (const step of [0.2, 0.55, 0.9]) {
    emitDemo(ACTION_PROGRESS_EVENT, { taskId, current: Math.floor(step * total), total, name: paths[0]?.split('\\').pop() ?? '', active: 1, stage: 'working' });
    await wait(260);
  }
  const outcomes = paths.map((path) => {
    const before = files.find((file) => file.path === path)?.size ?? 3 * MB;
    return { source: path, output: path.replace(/\.[^.]+$/, '.jpg'), sizeBefore: before, sizeAfter: Math.round(before * 0.38), error: null, unchanged: null, note: null };
  });
  return { actionId, outcomes, output: null, outputSize: null, total, cancelled: false, bundled: false, outputIsFolder: false, pagesDone: null, pagesTotal: null };
};

const tasks = (): unknown[] => {
  if (screen === 'task' || state === 'working') return [working];
  if (screen === 'result' || state === 'result') return [done];
  return [];
};

export const handlers: Record<string, Handler> = {
  get_settings           : () => view,
  update_settings        : ({ settings: next }) => (view = { ...view, ...(next as object) }),
  get_account_name       : () => 'Ana',
  get_history            : () => entries,
  get_active_tasks       : tasks,
  get_update             : () => null,
  get_cursor_position    : () => ({ x: 4000, y: 4000 }),
  get_disk_space         : () => ({ free: 128 * GB, total: 476 * GB }),
  get_downloads_to_sort  : () => ({ folder: 'C:\\Users\\Ana\\Downloads', count: 64, bytes: 2.3 * GB }),
  take_explorer_requests : explorer,
  take_launch_open       : () => false,
  get_launch_info        : () => ({ autostart: true }),
  get_island_screens     : () => [{ id: 'demo', primary: true, scale: 1, bounds: { x: 0, y: 0, ...SCREEN }, work: { x: 0, y: 0, width: SCREEN.width, height: SCREEN.height - TASKBAR } }],
  set_island_frame       : ({ request }) => islandFrame.setFrame(request),
  set_island_area        : ({ rect }) => islandFrame.setArea(rect),
  get_files_info         : ({ paths }) => (paths as string[]).map((path) => files.find((file) => file.path === path) ?? files[0]),
  get_performance        : () => ({ cpu: 18, memoryUsed: 9.9 * GB, memoryTotal: 16 * GB, diskBusy: 4, disks: [{ letter: 'C:', free: 128 * GB, total: 476 * GB }], battery: null, uptime: 5 * 3600 + 1260, apps: [] }),
  get_island_status      : () => ({ visible: true, fullscreen: false, trayHidden: false, capturing: false, area: islandFrame.area() ?? { x: 0, y: 0, width: 0, height: 0 }, dragging: false }),
  get_clipboard_status   : () => ({ supported: true, enabled: true, pausedUntil: null, count: clips.length, limit: 200, excluded: [] }),
  list_clips             : () => clips.map((clip) => ({ ...clip, date: new Date(Date.now() - clip.minutesAgo * 60_000).toISOString() })),
  get_clip_image         : () => paint(640, 360, landscape),
  get_auto_folders       : () => ({ ...autoFolders, rules: autoFolders.rules.map((rule) => ({ ...rule, lastRun: Date.now() - 50 * 60_000 })) }),
  get_space_places       : () => [{ path: 'C:\\Users\\Ana', label: 'Tu carpeta (Ana)', free: 128 * GB, total: 476 * GB }, { path: 'C:\\', label: 'Disco local (C:)', free: 128 * GB, total: 476 * GB }],
  get_space_view         : () => space,
  get_duplicate_defaults : () => ({ folders: ['Downloads', 'Documents', 'Pictures', 'Desktop', 'Videos'].map((name) => `C:\\Users\\Ana\\${name}`), minSize: 10 * 1024 }),
  scan_duplicates        : () => duplicates,
  get_autostart          : () => true,
  get_taskbar_state      : () => ({ autohide: false, edge: 'bottom' }),
  get_shortcut           : ({ target }) => ({ shortcut: target === 'clipboard' ? 'Ctrl+Alt+Shift+H' : target === 'island' ? 'Ctrl+Alt+Shift+G' : 'Ctrl+Alt+Shift+T', enabled: true, taken: false }),
  get_transcribe_engine  : () => ({ mode: 'auto', engine: { kind: 'gpu', name: 'Tarjeta de video' } }),
  get_background_model   : () => ({ installed: true, size: 44 * MB, partial: 0 }),
  get_video_tool         : () => ({ installed: true, size: 52 * MB, partial: 0 }),
  get_transcribe_model   : () => ({ installed: true, size: 574 * MB, partial: 0 }),
  get_upscale_model      : () => ({ installed: false, size: 5 * MB, partial: 0 }),
  set_island_focus       : () => null,
  open_media             : () => ({ info: { duration: 24, hasVideo: true, width: 1280, height: 720, hasAudio: true, audioCodec: 'aac', videoCodec: 'h264', bitrate: 900_000 }, url: '/demo-media/clase.mp4' }),
  listen_subtitles       : () => subtitles,
  get_media_strip        : () => paint(960, 54, landscape),
  get_media_wave         : ({ bars }) => Array.from({ length: Number(bars) || 120 }, (_, index) => 0.25 + 0.6 * Math.abs(Math.sin(index / 3.1))),
  get_media_keyframes    : () => [],
  close_media            : () => null,
  open_scan_photo        : ({ path }) => ({ path, width: 1600, height: 1200, corners: [{ x: 0.2, y: 0.1 }, { x: 0.82, y: 0.14 }, { x: 0.78, y: 0.92 }, { x: 0.16, y: 0.88 }], found: true }),
  get_scan_photo         : () => paint(1600, 1200, sheetOnTable),
  get_scan_preview       : () => paint(850, 1100, flatSheet),
  read_file_bytes        : () => paint(480, 360, landscape),
  get_image_preview      : () => paint(480, 360, landscape),
  is_glup_in_front       : () => true,
  dismiss_task           : () => null,
  run_action             : runAction,
  estimate_transcription : () => 40,
  get_heif_support       : () => ({ heic: true, avif: true, ffmpeg: true }),
  get_text_support       : () => ({ supported: true, language: 'es' }),
  open_island            : () => null,
  close_scan             : () => null,
  log_island             : () => null,
  notify_task            : () => false,
};

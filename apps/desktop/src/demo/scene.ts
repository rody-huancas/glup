import { emitDemo } from '@/demo/bus';
import { startScan } from '@/modules/duplicates/store/duplicatesStore';
import { dismissToast } from '@/modules/notices/store/toastStore';
import { DRAG_DROP_EVENT } from '@/demo/tauri/webview';
import { AUTO_FOLDERS_DONE_EVENT, ISLAND_OPEN_EVENT, ISLAND_ZONE_EVENT, NOTIFICATION_OPEN_EVENT } from '@/shared/constants/events';

// What the URL asks for: ?screen=home|tools|family&id=pdf|history|clipboard|space|duplicates|settings…,
// ?state=working|result (a task), ?island=collapsed|notice|open, ?scene=desktop (the island on a desktop).
export const params = new URLSearchParams(window.location.search);

export const screen = params.get('screen') ?? 'home';
export const state  = params.get('state');
export const island = params.get('island') ?? 'open';
export const scene  = params.get('scene');

const PAGES: Record<string, string> = {
  home       : 'home',
  task       : 'home',
  result     : 'home',
  tools      : 'tools',
  history    : 'history',
  clipboard  : 'clipboard',
  space      : 'space',
  duplicates : 'duplicates',
  settings   : 'settings',
  position   : 'settings',
};

export const pageOf = (): string => (screen === 'family' ? `family-${params.get('id') ?? 'pdf'}` : PAGES[screen] ?? screen);

const wait = (ms: number) => new Promise((done) => window.setTimeout(done, ms));

// Glup opens as if the cursor were over it, on the screen asked; a notice is one of Carpetas automáticas.
export const play = async () => {
  await wait(400);
  if (island === 'collapsed') return;
  if (island === 'notice') {
    emitDemo(AUTO_FOLDERS_DONE_EVENT, { message: 'Listo · de 4,8 MB a 1,1 MB', tone: 'success' });
    return;
  }
  emitDemo(ISLAND_ZONE_EVENT, true);
  emitDemo(ISLAND_OPEN_EVENT, null);
  if (screen !== 'subtitles' && screen !== 'scan') emitDemo(NOTIFICATION_OPEN_EVENT, pageOf());
  // Archivos repetidos shows a search already done.
  if (screen === 'duplicates') {
    await wait(300);
    startScan();
    await wait(900);
    dismissToast();
  }
  // Ajustes › Posición, in view.
  if (screen === 'position') {
    await wait(700);
    [...document.querySelectorAll('h2, h3, p, span')].find((element) => element.textContent === 'Posición de Glup')?.scrollIntoView({ block: 'start' });
  }
};

// For the GIF: the cursor comes, a file is dropped.
export const demoControls = {
  hover : (inside: boolean) => emitDemo(ISLAND_ZONE_EVENT, inside),
  open  : () => emitDemo(ISLAND_OPEN_EVENT, null),
  drag  : (paths: string[]) => emitDemo(DRAG_DROP_EVENT, { type: 'enter', paths }),
  drop  : (paths: string[]) => emitDemo(DRAG_DROP_EVENT, { type: 'drop', paths }),
};

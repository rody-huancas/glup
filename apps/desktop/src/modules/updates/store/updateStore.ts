import { listen } from '@tauri-apps/api/event';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import type { UpdateInfo } from '@/modules/updates/interfaces/updateInfo';
import type { UpdateProgress } from '@/modules/updates/interfaces/updateProgress';
import type { UpdateState } from '@/modules/updates/interfaces/updateState';
import { checkUpdate, getAppVersion, getUpdate, installUpdate } from '@/modules/updates/services/updates';
import { UPDATE_AVAILABLE_EVENT, UPDATE_PROGRESS_EVENT } from '@/shared/constants/events';

// Module-level: the dot in the menu and the card in Ajustes read the same state, on any page.
// Rust checks on its own (at start and every 6 hours) and announces what it finds.
let state: UpdateState = { version: null, available: null, phase: 'idle', progress: null, error: null };
let started             = false;
const listeners         = new Set<() => void>();

const setState = (change: Partial<UpdateState>) => {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
};

// A failed check or read never shows: Glup tries again later.
const start = () => {
  if (started) return;
  started = true;

  void getAppVersion().then((version) => setState({ version })).catch(() => undefined);
  void getUpdate().then((available) => available && setState({ available })).catch(() => undefined);
  void listen<UpdateInfo>(UPDATE_AVAILABLE_EVENT, ({ payload }) => setState({ available: payload }));
  void listen<UpdateProgress>(UPDATE_PROGRESS_EVENT, ({ payload }) => {
    if (state.phase === 'installing') setState({ progress: payload });
  });
};

export const subscribeUpdate = (listener: () => void): (() => void) => {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getUpdateState = (): UpdateState => state;

// "Buscar actualizaciones".
export const checkNow = () => {
  if (state.phase === 'checking' || state.phase === 'installing') return;

  setState({ phase: 'checking', error: null });
  void checkUpdate()
    .then((available) => setState(available ? { available, phase: 'idle' } : { phase: 'up-to-date' }))
    .catch(() => setState({ phase: 'check-failed' }));
};

// "Actualizar ahora": if it works Glup closes and opens again, so only a failure comes back.
export const installNow = () => {
  if (state.phase === 'installing' || !state.available) return;

  setState({ phase: 'installing', progress: null, error: null });
  void installUpdate().catch((error: unknown) => {
    setState({ phase: 'install-failed', progress: null, error: typeof error === 'string' ? error : UPDATE_TEXTS.installError });
  });
};

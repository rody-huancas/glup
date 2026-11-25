import { listen } from '@tauri-apps/api/event';
import type { AutoFoldersView } from '@/modules/auto-folders/interfaces/autoFoldersView';
import { getAutoFolders } from '@/modules/auto-folders/services/autoFolders';
import { AUTO_FOLDERS_CHANGED_EVENT } from '@/shared/constants/events';

// Module-level, so the screen and the dot on Tu PC read the same rules; Rust says when they change.
interface AutoFoldersState {
  view   : AutoFoldersView | null;
  failed : boolean;
}

let state: AutoFoldersState = { view: null, failed: false };
let started                 = false;
const listeners             = new Set<() => void>();

const setState = (next: AutoFoldersState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const refreshAutoFolders = () => {
  void getAutoFolders()
    .then((view) => setState({ view, failed: false }))
    .catch(() => setState({ view: state.view, failed: true }));
};

// After a change made from the screen: the view it returned.
export const showAutoFolders = (view: AutoFoldersView) => setState({ view, failed: false });

const start = () => {
  if (started) return;
  started = true;
  void listen(AUTO_FOLDERS_CHANGED_EVENT, refreshAutoFolders);
  refreshAutoFolders();
};

export const subscribeAutoFolders = (listener: () => void): (() => void) => {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAutoFoldersState = (): AutoFoldersState => state;

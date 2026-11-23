import type { TaskToast } from '@/modules/notices/interfaces/taskToast';

// Module-level, so a toast survives the page changing under it. One on screen at a time (the newest),
// and at most one waiting for the panel to open.
interface ToastState {
  current : TaskToast | null;
  waiting : TaskToast | null;
}

let state: ToastState = { current: null, waiting: null };
const listeners       = new Set<() => void>();

const setState = (change: Partial<ToastState>) => {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
};

export const subscribeToasts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToasts = (): ToastState => state;

export const showToast = (toast: TaskToast) => setState({ current: toast });

// The panel is closed: it shows when the panel opens.
export const waitForOpen = (toast: TaskToast) => setState({ waiting: toast });

export const panelOpened = () => {
  if (state.waiting) setState({ current: state.waiting, waiting: null });
};

export const dismissToast = () => setState({ current: null });

// A Windows notification for that task was clicked: its result shows directly, no toast for it.
export const dropToastFor = (taskId: string) => {
  setState({
    current : state.current?.taskId === taskId ? null : state.current,
    waiting : state.waiting?.taskId === taskId ? null : state.waiting,
  });
};

// Whether the panel is open (the island expanded), for screens that only work while they are seen.
let open        = false;
const listeners = new Set<() => void>();

export const setPanelOpen = (value: boolean) => {
  if (value === open) return;
  open = value;
  listeners.forEach((listener) => listener());
};

export const isPanelOpen = (): boolean => open;

export const subscribePanel = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// The files that come to «Renombrar en lote» from elsewhere (the right click, the actions of a drop).
let waiting: string[] | null = null;
const listeners              = new Set<() => void>();

export const sendToRename = (paths: string[]) => {
  waiting = paths;
  listeners.forEach((listener) => listener());
};

export const takeRenameInbox = (): string[] | null => {
  const taken = waiting;
  waiting     = null;
  return taken;
};

export const subscribeRenameInbox = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

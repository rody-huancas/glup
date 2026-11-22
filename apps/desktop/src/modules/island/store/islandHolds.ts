// Dialogs that keep the island open (Limpieza's confirmation, file pickers), counted outside React so
// any module can take one.
let count       = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export const subscribeIslandHolds = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getIslandHolds = (): number => count;

// Returns its release; releasing twice does nothing.
export const holdIsland = (): (() => void) => {
  let released = false;
  count       += 1;
  emit();

  return () => {
    if (released) return;

    released = true;
    count    = Math.max(0, count - 1);
    emit();
  };
};

// Keeps it open while a native dialog (file or folder picker) is up.
export const holdWhile = async <T>(work: () => Promise<T>): Promise<T> => {
  const release = holdIsland();

  try {
    return await work();
  } finally {
    release();
  }
};

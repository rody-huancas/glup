// The history line to open and show when Historial appears ("Ver" in the island's notice, its Windows
// notification). Outside React so the island can set it before the page exists.
let revealed: string | null = null;
const listeners             = new Set<() => void>();

export const subscribeHistoryReveal = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getHistoryReveal = (): string | null => revealed;

export const revealHistoryEntry = (id: string) => {
  revealed = id;
  listeners.forEach((listener) => listener());
};

export const clearHistoryReveal = () => {
  revealed = null;
};

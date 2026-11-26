// The events Rust would send, and what the demo sends itself (opening the island, a dropped file).
type Handler = (event: { event: string; id: number; payload: unknown }) => void;

const handlers = new Map<string, Set<Handler>>();
let next         = 0;

export const listenTo = (name: string, handler: Handler): (() => void) => {
  const set = handlers.get(name) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(name, set);
  return () => set.delete(handler);
};

export const emitDemo = (name: string, payload?: unknown) => {
  next += 1;
  handlers.get(name)?.forEach((handler) => handler({ event: name, id: next, payload }));
};

import { emitDemo, listenTo } from '@/demo/bus';

type Handler<T> = (event: { event: string; id: number; payload: T }) => void;

export const listen = <T>(name: string, handler: Handler<T>): Promise<() => void> => Promise.resolve(listenTo(name, handler as Handler<unknown>));

export const emit = (name: string, payload?: unknown): Promise<void> => {
  emitDemo(name, payload);
  return Promise.resolve();
};

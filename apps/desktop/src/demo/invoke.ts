import { handlers } from '@/demo/handlers';

// Every call to Rust, answered with sample data; one that has none is told in the console.
export const demoInvoke = async (command: string, args?: Record<string, unknown>): Promise<unknown> => {
  const handler = handlers[command];
  if (!handler) {
    console.warn(`[glup:demo] sin datos para ${command}`);
    return null;
  }
  return handler(args ?? {});
};

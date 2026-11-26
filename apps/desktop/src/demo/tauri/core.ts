import { demoInvoke } from '@/demo/invoke';

export const invoke = <T>(command: string, args?: Record<string, unknown>): Promise<T> => demoInvoke(command, args) as Promise<T>;

export const convertFileSrc = (path: string): string => path;

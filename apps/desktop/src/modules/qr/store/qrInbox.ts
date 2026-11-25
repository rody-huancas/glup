import type { ReadCode } from '@/modules/qr/interfaces/readCode';

// What comes to Leer un QR from elsewhere: files (the right click, a drop) or the codes of a zone of the
// screen. It waits here until the screen takes it.
export interface QrInbox {
  paths? : string[];
  codes? : ReadCode[];
}

let waiting: QrInbox | null = null;
const listeners             = new Set<() => void>();

export const sendToQrReader = (inbox: QrInbox) => {
  waiting = inbox;
  listeners.forEach((listener) => listener());
};

// Taken once: the screen reads it and the inbox is empty again.
export const takeQrInbox = (): QrInbox | null => {
  const taken = waiting;
  waiting     = null;
  return taken;
};

export const subscribeQrInbox = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

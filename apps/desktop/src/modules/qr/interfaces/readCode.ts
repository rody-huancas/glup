import type { WifiSecurity } from '@/modules/qr/types/qrTypes';

// ReadKind in services/qr/parse.rs: what a code read means.
export type ReadKind =
  | { kind: 'link'; url: string; host: string; warnings: string[] }
  | { kind: 'wifi'; ssid: string; password: string; security: WifiSecurity; hidden: boolean }
  | { kind: 'contact'; name: string; phone: string; email: string; company: string; vcard: string }
  | { kind: 'email'; to: string; subject: string; body: string }
  | { kind: 'phone'; number: string }
  | { kind: 'text'; text: string };

export interface ReadCode {
  // "QR", "EAN-13", "Code 128"…
  format : string;
  text   : string;
  read   : ReadKind;
}

// The codes of one place they were looked for (a file, a page of a PDF, the screen, the clipboard).
export interface CodeSource {
  id    : string;
  label : string;
  codes : ReadCode[];
  error : string | null;
}

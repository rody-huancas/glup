import type { QrContent } from '@/modules/qr/interfaces/qrContent';
import type { CodeSource, ReadCode } from '@/modules/qr/interfaces/readCode';
import type { QrKind } from '@/modules/qr/types/qrTypes';

// Each kind starts empty (WhatsApp with Perú).
export const emptyContent = (kind: QrKind): QrContent => {
  switch (kind) {
    case 'wifi'     : return { kind, ssid: '', password: '', security: 'wpa', hidden: false };
    case 'whatsapp' : return { kind, country: '51', number: '', message: '' };
    case 'contact'  : return { kind, name: '', phone: '', email: '', company: '' };
    case 'email'    : return { kind, to: '', subject: '', body: '' };
    default         : return { kind: 'text', text: '' };
  }
};

// Whether there is enough to make it (the same rule as Rust's payload).
export const isFilled = (content: QrContent): boolean => {
  const has = (value: string) => value.trim() !== '';
  switch (content.kind) {
    case 'text'     : return has(content.text);
    case 'wifi'     : return has(content.ssid);
    case 'whatsapp' : return has(content.number);
    case 'contact'  : return has(content.name) || has(content.phone) || has(content.email);
    case 'email'    : return has(content.to);
  }
};

// The password shown as dots until «Mostrar».
export const masked = (password: string): string => '•'.repeat(Math.max(8, Math.min(16, password.length)));

// The codes of every source, the newest first, one card per code.
export const allCodes = (sources: CodeSource[]): { source: CodeSource; code: ReadCode; key: string }[] =>
  sources.flatMap((source) => source.codes.map((code, index) => ({ source, code, key: `${source.id}-${index}` })));

// A file name of a contact: "Ana Pérez.vcf" (what Windows does not allow in a name taken out).
export const contactFileName = (name: string, fallback: string): string => `${(name.trim() || fallback).replace(/[\\/:*?"<>|]/g, '').slice(0, 60)}.vcf`;

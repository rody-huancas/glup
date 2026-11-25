import type { WifiSecurity } from '@/modules/qr/types/qrTypes';

// QrContent in services/qr/content.rs.
export type QrContent =
  | { kind: 'text'; text: string }
  | { kind: 'wifi'; ssid: string; password: string; security: WifiSecurity; hidden: boolean }
  | { kind: 'whatsapp'; country: string; number: string; message: string }
  | { kind: 'contact'; name: string; phone: string; email: string; company: string }
  | { kind: 'email'; to: string; subject: string; body: string };

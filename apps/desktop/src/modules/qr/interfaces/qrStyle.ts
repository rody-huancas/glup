import type { QrShape } from '@/modules/qr/types/qrTypes';

export interface QrStyle {
  dark    : string;
  light   : string;
  dots    : QrShape;
  corners : QrShape;
  // In modules (4 is what the standard asks).
  margin  : number;
}

// LogoChoice in services/qr.
export type QrLogo = { kind: 'none' } | { kind: 'glup' } | { kind: 'file'; path: string };

export interface QrPreview {
  svg      : string;
  readable : boolean;
  contrast : { ratio: number; low: boolean; inverted: boolean };
  level    : 'H' | 'M';
  warnings : string[];
}

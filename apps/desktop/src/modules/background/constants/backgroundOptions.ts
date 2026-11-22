import type { BackgroundOption } from '@/modules/background/interfaces/backgroundOption';

// Transparent first: it is the default.
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { kind: 'transparent', label: 'Transparente', hint: 'PNG · Para usar en diseños' },
  { kind: 'white', label: 'Blanco', hint: 'JPG · Para fotos de documentos' },
];

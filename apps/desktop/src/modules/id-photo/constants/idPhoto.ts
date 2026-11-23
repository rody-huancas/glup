import type { IdFormat } from '@/modules/id-photo/interfaces/idFormat';
import type { IdKind } from '@/modules/id-photo/types/idKind';
import type { Face } from '@/modules/mascot/interfaces/face';

// Same limits as Rust (services/id_photo/layout.rs).
export const MIN_CUSTOM_CM = 1;
export const MAX_CUSTOM_CM = 10;

export const ID_FORMATS: Record<Exclude<IdKind, 'custom'>, IdFormat> = {
  passport : { kind: 'passport', widthCm: 3.5, heightCm: 4.5 },
  square   : { kind: 'square', widthCm: 5, heightCm: 5 },
};

export const ID_KIND_ORDER: IdKind[] = ['passport', 'square', 'custom'];

// Glup when the photo has no single face.
export const CONFUSED_FACE: Partial<Face> = { mouth: 'wavy' };

// The preview frame is this tall on screen; zoom goes from half to three times the size suggested.
export const PREVIEW_FRAME_HEIGHT = 260;
export const MIN_ZOOM             = 0.5;
export const MAX_ZOOM             = 3;
export const ZOOM_STEP            = 1.1;

export const ID_PHOTO_TEXTS = {
  formatTitle   : '¿Para qué es?',
  passport      : 'Tamaño pasaporte · 3,5 × 4,5 cm',
  passportTip   : 'Para trámites, colegio, universidad',
  square        : 'Cuadrada · 5 × 5 cm',
  squareTip     : 'La piden algunos consulados',
  custom        : 'Personalizada',
  customTip     : 'Ancho y alto en cm',
  width         : 'Ancho',
  height        : 'Alto',
  unit          : 'cm',
  outputs       : 'Qué te entrego',
  photo         : 'La foto sola',
  sheet         : 'Hoja para imprimir 10 × 15 cm',
  note          : 'Revisa los requisitos del lugar donde la vas a presentar: algunos piden medidas distintas.',
  next          : 'Continuar',
  previewTitle  : 'Revisa el encuadre',
  preparing     : 'Quitando el fondo y buscando tu cara…',
  adjustHint    : 'Arrastra para moverla y usa la rueda o los botones para el tamaño.',
  zoomIn        : 'Más grande',
  zoomOut       : 'Más chica',
  reset         : 'Como estaba',
  done          : 'Listo',
  badSize       : `Usa medidas entre ${MIN_CUSTOM_CM} y ${MAX_CUSTOM_CM} cm`,
  noOutput      : 'Elige al menos una de las dos',
  taskTitle     : (name: string) => `Foto tamaño carnet · ${name}`,
  frame         : 'Encuadre de la foto',
};

import type { SupportedFileType } from '@/modules/actions/types/fileType';
import type { Face } from '@/modules/mascot/interfaces/face';

export const HOME_TEXTS = {
  title       : '¿Qué le damos de comer hoy?',
  subtitle    : 'Suéltale tus archivos o elige una familia de herramientas.',
  dropTitle   : 'Suelta aquí tus archivos',
  // With files chosen, the zone is a one-line bar.
  dropMore    : 'Suelta más archivos o elige',
  chooseFiles : 'Elegir archivos',
  back        : 'Volver',
  tipTitle    : 'Truco',
  tipText     : 'Lleva un archivo al borde de arriba de tu pantalla y Glup se lo come sin abrir esta ventana.',
};

export const DROP_ZONE_FACE: Partial<Face> = { mouth: 'o' };

// Under the title, what Glup takes ("PDF, imágenes, audio y video"): the kinds come from tools.json,
// these are only their words and their order.
export const ACCEPTED_LABELS: Record<SupportedFileType, string> = {
  pdf   : 'PDF',
  image : 'imágenes',
  audio : 'audio',
  video : 'video',
};

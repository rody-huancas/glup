import type { Face } from '@/modules/mascot/interfaces/face';

export const HOME_TEXTS = {
  dropTitle   : 'Suelta aquí tus archivos',
  dropHint    : 'Suelta algo aquí o elige qué hacemos',
  // With files chosen, the zone is a one-line bar.
  dropMore    : 'Suelta más archivos o elige',
  chooseFiles : 'Elegir archivos',
  back        : 'Volver',
  tipTitle    : 'Truco',
  tipText     : 'Lleva un archivo al borde de arriba de tu pantalla y Glup se lo come sin abrir esta ventana.',
};

export const DROP_ZONE_FACE: Partial<Face> = { mouth: 'o' };

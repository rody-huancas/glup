import type { Face } from '@/modules/mascot/interfaces/face';

export const HOME_TEXTS = {
  title       : '¿Qué le damos de comer hoy?',
  subtitle    : 'Suelta un archivo o elige una herramienta.',
  dropTitle   : 'Suelta aquí tus PDFs o imágenes',
  dropHint    : 'Varios a la vez también vale.',
  chooseFiles : 'Elegir archivos',
  quickTools  : 'Herramientas rápidas',
  back        : 'Volver',
  tipTitle    : 'Truco',
  tipText     : 'Lleva un archivo al borde de arriba de tu pantalla y Glup se lo come sin abrir esta ventana.',
};

export const DROP_ZONE_FACE: Partial<Face> = { mouth: 'o' };

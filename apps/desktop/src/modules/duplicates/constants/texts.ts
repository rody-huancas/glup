import type { FileKind } from '@/modules/duplicates/types/fileKind';

export const DUPLICATES_TEXTS = {
  title       : 'Archivos repetidos',
  subtitle    : 'Encuentro copias del mismo archivo para que liberes espacio. Todo va a la papelera.',
  where       : 'Dónde busco',
  addFolder   : 'Agregar carpeta',
  removeOf    : (name: string) => `No buscar en ${name}`,
  noFolders   : 'Elige al menos una carpeta.',
  minSize     : 'Archivos desde',
  similar     : 'Buscar también fotos parecidas',
  similarHint : 'Ráfagas, la misma foto en otro tamaño o guardada de nuevo. Van aparte y sin marcar.',
  scan        : 'Buscar repetidos',
  scanAgain   : 'Buscar de nuevo',
  scanTask    : 'Buscar archivos repetidos',
  removeTask  : 'Quitar archivos repetidos',
  intro       : 'Miro tus carpetas sin tocar nada. Nunca entro en Windows, en tus programas, en AppData ni en la papelera, y no descargo lo que está solo en la nube.',
  scanning    : 'Buscando…',
  waiting     : 'En espera: termino lo que estoy haciendo y busco',
  cancel      : 'Cancelar',
  cancelling  : 'Cancelando…',
  same        : 'Copias exactas',
  alike       : 'Fotos parecidas',
  alikeHint   : 'Se parecen, pero no son iguales: mira antes de quitar alguna.',
  copies      : (count: number) => `${count} copias`,
  frees       : (size: string) => `${size} para liberar`,
  keep        : 'Queda',
  review      : 'Revisar',
  reviewHint  : 'Las copias están en carpetas tuyas distintas: elige tú cuál quitar.',
  keepThis    : (name: string) => `Que quede ${name}`,
  quit        : (name: string) => `Quitar ${name}`,
  lastOne     : 'Queda al menos una copia de cada grupo',
  openFolder  : 'Abrir carpeta',
  openFolderOf: (name: string) => `Abrir la carpeta de ${name}`,
  kinds       : { all: 'Todo', photos: 'Fotos', videos: 'Videos', documents: 'Documentos', other: 'Otros' } satisfies Record<FileKind, string>,
  kindLabel   : 'Tipo',
  folderLabel : 'Carpeta',
  allFolders  : 'Todas las carpetas',
  more        : (count: number) => `Ver ${count} grupos más`,
  nothingHere : 'Nada con ese filtro.',
  marked      : (count: number, size: string) => (count === 1 ? `1 marcado · ${size}` : `${count} marcados · ${size}`),
  remove      : (size: string) => `Quitar ${size}`,
  removing    : 'Quitando…',
  confirmTitle: '¿Las quito?',
  confirmBody : (count: number, size: string) => `Mando ${count === 1 ? '1 archivo' : `${count} archivos`} (${size}) a la papelera. Si te arrepientes, los recuperas de ahí.`,
  confirm     : 'Quitar',
  keepLooking : 'Seguir mirando',
};

// «Archivos desde»: the smallest size looked at.
export const MIN_SIZE_OPTIONS = [
  { label: 'Cualquier tamaño', bytes: 1 },
  { label: '10 KB', bytes: 10 * 1024 },
  { label: '100 KB', bytes: 100 * 1024 },
  { label: '1 MB', bytes: 1024 * 1024 },
];

// How many groups show at first, and how many more each time.
export const GROUPS_PAGE = 40;

export const THUMB_HEIGHT = 56;

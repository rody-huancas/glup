import { LOW_SPACE_SHARE } from '@/modules/cleanup/constants/categories';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { formatCount } from '@/shared/utils/numbers';

const MB = 1024 * 1024;

// When a suggestion is worth showing.
export const SUGGESTION_LIMITS = {
  lowDisk        : LOW_SPACE_SHARE,
  cleanupBytes   : 500 * MB,
  downloadsBytes : 1024 * MB,
  downloadsCount : 30,
  // The size in a key is rounded to this, so a few MB more never bring a closed one back.
  keyStep        : 100 * MB,
  // How many closed ones are remembered.
  remembered     : 12,
};

// Accesos rápidos: favorites first; without them, the most used.
export const QUICK_LIMIT = 4;

// Lo último.
export const RECENT_COUNT = 3;

// Descargas is read again at most this often while Inicio comes and goes.
export const DOWNLOADS_TTL = 5 * 60 * 1000;

export const DASHBOARD_TEXTS = {
  files       : (count: number) => (count === 1 ? 'archivo procesado' : 'archivos procesados'),
  saved       : 'ahorrados',
  audio       : 'de audio a texto',
  screenTexts : (count: number) => (count === 1 ? 'texto copiado de la pantalla' : 'textos copiados de la pantalla'),
  quick       : 'Accesos rápidos',
  quickUsed   : 'Lo que más usas',
  quickEmpty  : 'Marca con ★ tus herramientas favoritas en Habilidades y aparecerán aquí.',
  recent      : 'Lo último',
  recentEmpty : 'Todavía no hice nada. Lo que hagamos aparecerá aquí.',
  seeAll      : 'Ver todo',
  openFolder  : 'Abrir carpeta',
  openFolderOf: (name: string) => `Abrir la carpeta de ${name}`,
  missing     : 'Ya no está donde lo dejé',
  pc          : 'Tu PC',
  diskFree    : (free: number, total: number) => `${formatFileSize(free)} libres de ${formatFileSize(total)}`,
  disk        : 'Disco',
  memory      : 'Memoria',
  memoryUsed  : (percent: number) => `${Math.round(percent)} % en uso`,
  reading     : 'Leyendo…',
  performance : 'Ver Rendimiento',
  close       : 'Cerrar la sugerencia',
  lowDisk     : (free: number) => `Te quedan ${formatFileSize(free)} libres en el disco. ¿Vemos qué se puede borrar?`,
  lowDiskGo   : 'Abrir Limpieza',
  cleanup     : (bytes: number) => `Limpieza encontró ${formatFileSize(bytes)} que puedes liberar.`,
  cleanupGo   : 'Ver Limpieza',
  downloads   : (bytes: number, count: number) => `Tienes ${formatFileSize(bytes)} en Descargas para ordenar (${formatCount(count)} archivos).`,
  downloadsGo : 'Ordenar Descargas',
};

export const minutesOf = (seconds: number): string => (seconds > 0 && seconds < 60 ? '<1' : String(Math.round(seconds / 60)));

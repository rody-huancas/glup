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

// Atajos: the favorites, then the most used, then these (by id of tools.json).
export const SHORTCUT_COUNT = 4;
export const POPULAR_TOOLS  = ['compress-image', 'convert-image', 'transcribe', 'merge-pdf'];

// «Seguir donde quedamos».
export const RECENT_COUNT = 3;
// The longest a file name is shown before it is cut in the middle.
export const RECENT_NAME = 34;

// «Esta semana hicimos»: how many numbers, and over this the memory is shown in coral.
export const WEEK_STATS   = 2;
export const MEMORY_ALERT = 80;

// Descargas is read again at most this often while Inicio comes and goes.
export const DOWNLOADS_TTL = 5 * 60 * 1000;

export const DASHBOARD_TEXTS = {
  files       : (count: number) => (count === 1 ? 'archivo procesado' : 'archivos procesados'),
  saved       : 'ahorrados',
  audio       : 'de audio a texto',
  screenTexts : (count: number) => (count === 1 ? 'texto copiado de la pantalla' : 'textos copiados de la pantalla'),
  shortcuts   : 'Atajos',
  recent      : 'Seguir donde quedamos',
  week        : 'Esta semana hicimos',
  weekEmpty   : 'Todavía no hicimos nada esta semana',
  weekOpen    : 'Ver lo que hicimos, con el gráfico grande',
  weekDetail  : 'Lo que hicimos',
  closeDetail : 'Cerrar',
  minutes     : (seconds: number) => (Math.round(seconds / 60) === 1 ? 'minuto de audio a texto' : 'minutos de audio a texto'),
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

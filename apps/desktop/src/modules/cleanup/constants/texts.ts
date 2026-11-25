import type { CategoryId } from '@/modules/cleanup/types/categoryId';

interface CategoryText {
  name : string;
  hint : string;
}

const listNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

export const CLEANUP_TEXTS = {
  title       : 'Limpieza',
  subtitle    : 'Te muestro lo que encontré y tú eliges qué borrar.',
  disk        : (free: string, total: string) => `Tienes ${free} libres de ${total}`,
  diskError   : 'No pude leer el espacio del disco',
  diskLabel   : 'Espacio usado del disco',
  scan        : 'Revisar mi PC',
  scanAgain   : 'Revisar de nuevo',
  scanning    : (current: string) => (current ? `Revisando · ${current}` : 'Revisando tu PC…'),
  waiting     : 'En espera: termino lo que estoy haciendo y reviso',
  cancel      : 'Cancelar',
  cancelling  : 'Cancelando…',
  scanTask    : 'Revisar mi PC',
  cleanTask   : 'Liberar espacio',
  free        : (size: string) => `Liberar ${size}`,
  cleaning    : 'Liberando espacio…',
  deleting    : (current: string, total: string) => `Borrando ${current} de ${total}…`,
  nothing     : 'No encontré nada que valga la pena borrar. Tu PC está ordenada.',
  nothingHere : 'Nada por aquí',
  intro       : 'Reviso los temporales, las cachés de los navegadores, la papelera, Descargas y tus carpetas personales. No borro nada sin que lo marques.',
  expired     : 'Pasó un rato desde la última revisión y los archivos pueden haber cambiado.',
  marked      : (count: number) => (count === 0 ? 'Nada marcado' : `${count} ${count === 1 ? 'archivo marcado' : 'archivos marcados'}`),
  found       : (count: number) => `${count} ${count === 1 ? 'elemento' : 'elementos'}`,
  expand      : 'Ver lo encontrado',
  collapse    : 'Ocultar lo encontrado',
  mark        : (name: string) => `Marcar ${name}`,
  markItem    : (name: string) => `Marcar ${name}`,
  reveal      : 'Ver en carpeta',
  keeps       : 'Se queda',
  copy        : (group: number) => `Grupo ${group}`,
  wholeBin    : 'La papelera se vacía entera',
  running     : (names: string[]) => `Cierra ${listNames(names)} para liberar un poco más`,
  confirmTitle: '¿Libero este espacio?',
  toTrash     : 'Va a la papelera (puedes recuperarlo)',
  direct      : 'Se borra directamente (Windows y los navegadores lo vuelven a crear)',
  emptyBin    : 'Se vacía la papelera (ya no se puede recuperar)',
  confirm     : 'Liberar',
  keep        : 'Cancelar',
  files       : (count: number) => `${count} ${count === 1 ? 'archivo' : 'archivos'}`,
};

export const CATEGORY_TEXTS: Record<CategoryId, CategoryText> = {
  temp          : { name: 'Archivos temporales', hint: 'Lo que dejan los programas al trabajar, de hace más de un día' },
  browsers      : { name: 'Caché de navegadores', hint: 'Copias de páginas que el navegador guarda para abrirlas más rápido' },
  'recycle-bin' : { name: 'Papelera', hint: 'Lo que ya borraste y sigue ocupando lugar' },
  installers    : { name: 'Instaladores viejos', hint: 'Instaladores en Descargas de hace más de 30 días' },
  archives      : { name: 'Comprimidos ya abiertos', hint: 'ZIP, RAR y 7z en Descargas ya descomprimidos o de hace más de 30 días' },
  duplicates    : { name: 'Archivos repetidos', hint: 'Copias idénticas en Descargas, Escritorio, Documentos e Imágenes' },
  'large-files' : { name: 'Archivos grandes olvidados', hint: 'Más de 500 MB y sin tocar hace más de 6 meses' },
};

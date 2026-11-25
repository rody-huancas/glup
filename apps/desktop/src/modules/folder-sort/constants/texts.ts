import type { SkipReason } from '@/modules/folder-sort/types/skipReason';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';
import { formatCount } from '@/shared/utils/numbers';

const plural = (count: number, singular: string, many: string): string => `${formatCount(count)} ${count === 1 ? singular : many}`;

export const FOLDER_SORT_TEXTS = {
  title        : 'Ordenar una carpeta',
  subtitle     : 'Pongo cada archivo suelto en su carpeta, por tipo o por fecha',
  folder       : 'Carpeta',
  noFolder     : 'Elige la carpeta que quieres ordenar',
  pick         : 'Elegir otra',
  pickTitle    : 'Elige la carpeta que quieres ordenar',
  mode         : 'Cómo ordeno',
  intro        : 'Primero te muestro qué movería y adónde. Nada se mueve hasta que toques «Ordenar». Solo los archivos sueltos: las carpetas y lo que tienen adentro se quedan igual.',
  review       : 'Revisar la carpeta',
  reviewAgain  : 'Revisar de nuevo',
  sort         : 'Ordenar',
  sortTask     : 'Ordenando la carpeta',
  undoTask     : 'Deshaciendo el orden',
  sorting      : (name: string) => (name ? `Moviendo ${name}` : 'Ordenando…'),
  undoing      : (name: string) => (name ? `Devolviendo ${name}` : 'Deshaciendo…'),
  waiting      : 'Esperando a que termine lo anterior…',
  cancel       : 'Cancelar',
  cancelling   : 'Cancelando…',
  undo         : 'Deshacer',
  again        : 'Ordenar otra vez',
  plan         : (files: number, size: string, folders: number) => `Voy a mover ${plural(files, 'archivo', 'archivos')} (${size}) a ${plural(folders, 'carpeta', 'carpetas')}`,
  nothing      : 'No hay archivos sueltos que pueda ordenar aquí',
  files        : (count: number) => plural(count, 'archivo', 'archivos'),
  more         : (count: number) => `y ${plural(count, 'archivo', 'archivos')} más`,
  skipped      : (count: number) => `Lo que no voy a tocar (${formatCount(count)})`,
  skippedHint  : 'Lo dejo donde está',
  showFiles    : (folder: string) => `Ver los archivos que van a ${folder}`,
  failed       : 'No pude leer esa carpeta. Revisa que siga ahí y vuelve a intentarlo.',
  undoneNote   : 'Lo devolví todo a como estaba.',
};

export const SORT_MODE_TEXTS: Record<SortMode, { label: string; hint: string }> = {
  type : { label: 'Por tipo', hint: 'Imágenes, Documentos, PDFs, Videos…' },
  date : { label: 'Por fecha', hint: 'Año y mes en que cambió cada archivo' },
};

export const SKIP_REASON_TEXTS: Record<SkipReason, string> = {
  'downloading' : 'Se está descargando',
  'hidden'      : 'Oculto o del sistema',
  'recent'      : 'Cambió hace menos de 2 minutos',
  'in-use'      : 'Lo tiene abierto otro programa',
  'changed'     : 'Cambió después de revisar',
};

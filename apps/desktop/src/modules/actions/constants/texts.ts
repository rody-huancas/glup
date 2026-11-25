import type { ActionId } from '@/modules/actions/types/actionId';
import type { ProgressStage } from '@/modules/actions/types/progressStage';
import type { ProgressVia } from '@/modules/actions/types/progressVia';

export const ACTIONS_TEXTS = {
  titleSingle   : '¿Qué hago con él?',
  titleMultiple : '¿Qué hago con ellos?',
  formatsTitle  : '¿A qué formato?',
  back          : 'Volver',
  sameFormat    : 'Ya está en este formato',
  savedNextTo   : 'Se guarda junto al original.',
  working       : 'Trabajando…',
  learning      : 'Esto lo aprendo pronto',
  rejected      : 'Ese no me lo puedo comer todavía',
  close         : 'Cerrar',
  open          : 'Abrir',
  reveal        : 'Ver en carpeta',
  filesCount    : (count: number) => `${count} archivos`,
  progress      : (current: number, total: number) => `Trabajando… ${current} de ${total}`,
  progressCount : (current: number, total: number) => `${current} de ${total}`,
  cancel        : 'Cancelar',
  cancelling    : 'Cancelando…',
  loadingSlow   : 'Revisando tus archivos…',
  parallel      : (count: number) => `Trabajando en ${count} a la vez`,
  bundleZip     : 'Entregar todo en un ZIP',
};

export const RESULT_TEXTS = {
  done           : 'Listo',
  withoutBg      : (count: number) => `${count} ${count === 1 ? 'imagen' : 'imágenes'} sin fondo`,
  images         : (count: number) => `${count} ${count === 1 ? 'imagen' : 'imágenes'}`,
  sizeChange     : (before: string, after: string) => `de ${before} a ${after}`,
  partial        : (done: number, total: number, failed: number) => `${done} de ${total} listas · ${failed} no se pudo`,
  failedSingle   : 'No se pudo',
  failedAll      : 'No pude con ninguna',
  alreadySmall   : 'Ya pesaba poco',
  alreadySmallN  : 'Ya pesaban poco',
  bundled        : (items: string, size: string) => `Listo · ${items} en un ZIP · ${size}`,
  pdfs           : (count: number) => `${count} ${count === 1 ? 'PDF' : 'PDFs'}`,
  sameFormat     : 'Ya está en este formato',
  sameFormatN    : 'Ya estaban en este formato',
  cancelled      : (done: number, total: number) => `${done} de ${total} listas · cancelado`,
  cancelledPages : (done: number, total: number) => `${done} de ${total} páginas · cancelado`,
  skipped        : (count: number) => `${count} ya ${count === 1 ? 'estaba bien' : 'estaban bien'}`,
};

// The stages around the work itself: the same words for every action.
export const STAGE_TEXTS: Record<Exclude<ProgressStage, 'working'>, string> = {
  downloading : 'Descargando lo que necesito…',
  verifying   : 'Comprobando la descarga…',
  preparing   : 'Preparándome…',
  // "Escanear documento", sheet by sheet.
  straightening : 'Enderezando las hojas…',
  reading       : 'Leyendo el texto…',
  saving      : 'Guardando…',
};

// Added to the words of the work when it can go one way or the other: "Pasando a texto… (con la tarjeta de video)".
export const VIA_TEXTS: Record<ProgressVia, string> = {
  gpu : '(con la tarjeta de video)',
  cpu : '(con el procesador)',
};

// The work itself, in the words of each action (ACTIONS_TEXTS.working when it has none).
export const WORKING_TEXTS: Record<ActionId, string> = {
  'compress'          : 'Reduciendo el peso…',
  'convert'           : 'Convirtiendo…',
  'to-jpg'            : 'Pasando a JPG…',
  'to-pdf'            : 'Armando el PDF…',
  'remove-background' : 'Quitando el fondo…',
  'zip'               : 'Juntando en un ZIP…',
  'merge'             : 'Uniendo…',
  'split-pages'       : 'Separando las páginas…',
  'organize-pages'    : 'Ordenando las páginas…',
  'to-images'         : 'Pasando a imágenes…',
  'protect'           : 'Poniendo la contraseña…',
  'unlock'            : 'Quitando la contraseña…',
  'watermark'         : 'Poniendo la marca de agua…',
  'page-numbers'      : 'Numerando las páginas…',
  'extract-images'    : 'Sacando las imágenes…',
  'extract-text'      : 'Leyendo el texto…',
  'transcribe'        : 'Pasando a texto…',
  'id-photo'          : 'Guardando tu foto…',
  'sign'              : 'Firmando…',
  'scan'              : 'Escaneando…',
};

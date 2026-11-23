export const RECENT_LIMIT = 5;

export const MISSING_NOTICE_TIME = 2500;

// How long "Copiado" stays after "Copiar de nuevo".
export const COPIED_NOTICE_TIME = 2000;

// Characters of a copied text shown on its line, before "…".
export const TEXT_PREVIEW_LENGTH = 90;

export const HISTORY_TEXTS = {
  title        : 'Historial',
  subtitle     : 'Todo lo que hice con tus archivos.',
  recent       : 'Lo último que hice',
  seeAll       : 'Ver todo',
  empty        : 'Todavía no he comido nada.',
  missing      : 'Este archivo ya no está',
  clear        : 'Limpiar historial',
  clearTitle   : '¿Limpiar todo el historial?',
  clearBody    : 'Se quitará la lista de Glup. Tus archivos no se borran de tu PC.',
  clearCancel  : 'Cancelar',
  clearConfirm : 'Limpiar',
  clearFailed  : 'No pude cambiar el historial. Vuelve a intentarlo.',
  removeSome   : (count: number) => `Quitar seleccionados (${count})`,
  removeTitle  : (count: number) => `¿Quitar ${count} ${count === 1 ? 'elemento' : 'elementos'} del historial?`,
  removeBody   : (count: number) => `${count === 1 ? 'Se quitará' : 'Se quitarán'} de la lista de Glup. Tus archivos no se borran de tu PC.`,
  removeOk     : 'Quitar',
  selectAll    : 'Seleccionar todo',
  selectEntry  : (name: string) => `Seleccionar ${name}`,
  textDetail   : (detail: string) => `Texto de la pantalla · ${detail}`,
};

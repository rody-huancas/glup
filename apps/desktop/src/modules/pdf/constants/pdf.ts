// Thumbnail heights in CSS pixels; rendered at the screen's pixel ratio.
export const THUMBNAIL_HEIGHTS = {
  order : 48,
  pages : 96,
};

// The page shown under the options of "Marca de agua" and "Numerar páginas".
export const PREVIEW_HEIGHT = 176;
// Points across an A4 page: the preview scales sizes given in points with it.
export const A4_WIDTH       = 595;

// Page images: scale 2 is about 150 ppp for a regular page.
export const PAGE_RENDER_SCALE = 2;
export const JPEG_QUALITY      = 0.88;

// Raw page bytes go to Rust with these headers (see commands/actions.rs).
export const PAGE_IMAGE_HEADERS = {
  session : 'x-glup-session',
  page    : 'x-glup-page',
};

export const PDF_TEXTS = {
  orderTitle    : 'Ordena los archivos',
  mergeButton   : (count: number) => `Unir ${count} archivos`,
  moveUp        : 'Subir',
  moveDown      : 'Bajar',
  dragHandle    : 'Arrastrar para ordenar',
  pagesCount    : (count: number) => `${count} ${count === 1 ? 'página' : 'páginas'}`,
  splitTitle    : '¿Cómo lo separo?',
  splitAll      : 'Todas por separado',
  splitAllHint  : 'Un PDF por página',
  splitPick     : 'Elegir páginas',
  splitPickHint : 'Un PDF con las que marques',
  pagesTitle    : 'Elige las páginas',
  pagesField    : 'Páginas',
  pagesExample  : '1-3, 5, 8-10',
  pagesButton   : (count: number) => `Crear PDF con ${count} ${count === 1 ? 'página' : 'páginas'}`,
  imagesTitle   : '¿En qué formato?',
  pageProgress  : (page: number, total: number) => `Página ${page} de ${total}`,
  password      : 'Primero quítale la contraseña',
  // password      : 'Este PDF tiene contraseña, todavía no puedo abrirlo',
};

export const RANGE_ERRORS = {
  empty   : 'Escribe al menos una página',
  invalid : (part: string) => `No entiendo "${part}"`,
  missing : (page: number, total: number) => `La página ${page} no existe: el PDF tiene ${total}`,
};

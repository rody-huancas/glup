import type { InkColor, SolidInk } from '@/modules/sign/types/inkColor';

export const SIGN_TEXTS = {
  thumbnails      : 'Páginas',
  signatures      : 'Tus firmas',
  noSignatures    : 'Crea tu primera firma para ubicarla en el PDF.',
  create          : 'Crear firma',
  addDate         : 'Agregar fecha',
  addText         : 'Agregar texto',
  cancel          : 'Cancelar',
  save            : 'Guardar PDF firmado',
  note            : 'Firma visual: no reemplaza una firma digital certificada.',
  loading         : 'Abriendo el PDF…',
  unreadable      : 'No pude abrir este PDF',
  exitTitle       : '¿Salir sin guardar?',
  exitBody        : 'Se perderán las firmas que ubicaste',
  keepSigning     : 'Seguir firmando',
  exit            : 'Salir',
  deleteTitle     : '¿Borrar esta firma?',
  deleteBody      : 'Se quita de tus firmas y de las páginas donde la ubicaste.',
  delete          : 'Borrar',
  keep            : 'Cancelar',
  page            : (page: number, total: number) => `Página ${page} de ${total}`,
  previous        : 'Página anterior',
  next            : 'Página siguiente',
  zoomFit         : 'Ajustar',
  zoomActual      : '100%',
  zoomIn          : 'Acercar',
  zoomOut         : 'Alejar',
  duplicate       : 'Duplicar',
  repeat          : 'Repetir en todas las páginas',
  remove          : 'Quitar',
  smaller         : 'Letra más chica',
  bigger          : 'Letra más grande',
  edit            : 'Editar texto',
  defaultText     : 'Nombre y DNI',
  textField       : 'Texto',
  useSignature    : (index: number) => `Ubicar firma ${index}`,
  deleteSignature : 'Borrar firma',
  taskTitle       : (name: string) => `Firmar · ${name}`,
};

export const CREATE_TEXTS = {
  title           : 'Crear firma',
  tabs            : { draw: 'Dibujar', type: 'Escribir', upload: 'Subir foto' },
  clear           : 'Borrar',
  undo            : 'Deshacer',
  drawHint        : 'Firma sobre la línea',
  namePlaceholder : 'Escribe tu nombre',
  nameField       : 'Tu nombre',
  pick            : 'Toca la que más te guste',
  upload          : 'Elegir foto de tu firma',
  uploadHint      : 'Una foto o escaneo de tu firma sobre papel blanco',
  change          : 'Elegir otra foto',
  processing      : 'Limpiando la foto…',
  unreadable      : 'No pude leer esa imagen',
  empty           : 'No encontré trazos en la foto',
  onWhite         : 'Ver sobre blanco',
  keep            : 'Guardar para usarla otra vez',
  full            : 'Ya tienes 6 firmas guardadas: esta solo sirve ahora',
  accept          : 'Usar firma',
  cancel          : 'Cancelar',
  color           : 'Color',
  failed          : 'No pude guardar la firma',
};

export const INK_COLORS: Record<SolidInk, string> = {
  black : '#111111',
  blue  : '#1F3A93',
};

export const INK_LABELS: Record<InkColor, string> = {
  original : 'Original',
  black    : 'Negro',
  blue     : 'Azul tinta',
};

export const DRAW_INKS: SolidInk[]   = ['black', 'blue'];
export const UPLOAD_INKS: InkColor[] = ['original', 'black', 'blue'];

export const MAX_SIGNATURES = 6;

// A new signature takes 30% of the page width, centered.
export const INITIAL_WIDTH = 0.3;

// Same values as Rust (services/pdf/sign.rs): a text box is TEXT_LINE_HEIGHT font sizes tall, with the
// baseline TEXT_BASELINE font sizes above its bottom; Helvetica in the PDF, the closest font on screen.
export const TEXT_LINE_HEIGHT  = 1.25;
export const TEXT_BASELINE     = 0.37;
export const TEXT_FONT         = 'Helvetica, Arial, sans-serif';
export const TEXT_FONT_SIZES   = { initial: 12, min: 6, max: 72, step: 2 };
// Room so the measured width never clips the last letter.
export const TEXT_WIDTH_SLACK  = 0.15;

// Arrow keys move 1 px, 10 px with Shift; corners never shrink an element under 16 px.
export const KEY_STEPS     = { small: 1, large: 10 };
export const MIN_SIZE      = 16;
export const DUPLICATE_GAP = 0.03;

// pdf.js "100%": one PDF point is 96/72 CSS pixels.
export const ZOOM = { step: 1.25, min: 0.25, max: 4, actual: 96 / 72, margin: 16 };

export const THUMBNAIL_HEIGHT = 104;

export const DRAW_CANVAS = { width: 480, height: 180, guide: 136, exportScale: 2 };

// perfect-freehand: pressure simulated from the speed, so fast strokes come out thinner.
export const STROKE_OPTIONS = { size: 5, thinning: 0.6, smoothing: 0.55, streamline: 0.45, simulatePressure: true };

export const TYPED_FONT_SIZE = 96;
// Uploads keep their full resolution now.
// export const UPLOAD_MAX_SIDE = 1400;
export const CROP_PADDING    = 6;

export const SIGNATURE_HEADERS = { keep: 'x-glup-keep' };

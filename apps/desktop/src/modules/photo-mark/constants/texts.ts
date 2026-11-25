import type { MarkFont, MarkKind, MarkPlace } from '@/modules/photo-mark/types/markTypes';
import { formatCount } from '@/shared/utils/numbers';

export const MARK_TEXTS = {
  title       : 'Marca de agua',
  subtitle    : (count: number) => (count === 1 ? '1 foto' : `${formatCount(count)} fotos`),
  kind        : 'Qué pongo',
  kinds       : {
    text : { label: 'Texto', hint: 'Tu nombre, tu marca, ©…' },
    logo : { label: 'Logo', hint: 'Un PNG tuyo' },
  } satisfies Record<MarkKind, { label: string; hint: string }>,
  text        : 'Texto',
  placeholder : '© Tu nombre',
  font        : 'Letra',
  color       : 'Color',
  shadow      : 'Sombra suave',
  shadowHint  : 'Para que se lea sobre lo claro y lo oscuro',
  chooseLogo  : 'Elegir logo (PNG)…',
  changeLogo  : 'Cambiar logo…',
  pickTitle   : 'Elige tu logo',
  pickFilter  : 'Imagen PNG',
  place       : 'Dónde',
  mosaic      : 'En mosaico',
  mosaicHint  : 'Repetida y girada, para proteger la foto',
  size        : 'Tamaño',
  opacity     : 'Opacidad',
  percent     : (value: number) => `${Math.round(value * 100)} %`,
  needsMark   : 'Escribe el texto o elige un logo.',
  save        : 'Guardar con marca',
};

export const FONT_LABELS: Record<MarkFont, string> = { sans: 'Segoe UI', arial: 'Arial', serif: 'Georgia', mono: 'Consolas', impact: 'Impact', script: 'Segoe Script' };

// The same letters Rust draws (services/photo_mark/draw.rs, font_files), for the live preview.
export const FONT_CSS: Record<MarkFont, { family: string; weight: number }> = {
  sans   : { family: "'Segoe UI', sans-serif", weight: 700 },
  arial  : { family: 'Arial, sans-serif', weight: 700 },
  serif  : { family: 'Georgia, serif', weight: 700 },
  mono   : { family: 'Consolas, monospace', weight: 700 },
  impact : { family: 'Impact, sans-serif', weight: 400 },
  script : { family: "'Segoe Script', cursive", weight: 400 },
};

export const PLACE_LABELS: Record<Exclude<MarkPlace, 'mosaic'>, string> = {
  'top-left'     : 'Arriba a la izquierda',
  'top'          : 'Arriba al centro',
  'top-right'    : 'Arriba a la derecha',
  'left'         : 'Al centro a la izquierda',
  'center'       : 'En el centro',
  'right'        : 'Al centro a la derecha',
  'bottom-left'  : 'Abajo a la izquierda',
  'bottom'       : 'Abajo al centro',
  'bottom-right' : 'Abajo a la derecha',
};

export const GRID_PLACES = Object.keys(PLACE_LABELS) as Exclude<MarkPlace, 'mosaic'>[];
export const FONTS = Object.keys(FONT_LABELS) as MarkFont[];

export const DEFAULT_MARK = { kind: 'text', text: '', font: 'sans', color: '#FFFFFF', shadow: true, logo: null, place: 'bottom-right', size: 0.06, opacity: 0.7 } as const;

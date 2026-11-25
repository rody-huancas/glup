import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import type { NumberFormat, NumberPosition } from '@/modules/pdf/types/numbering';
import { formatCount } from '@/shared/utils/numbers';

export const NUMBERING_TEXTS = {
  title       : 'Numerar páginas',
  position    : 'Dónde',
  format      : 'Cómo',
  startPage   : 'Empezar en la página',
  firstNumber : 'Con el número',
  startHint   : 'Para saltar la carátula, empieza en la 2.',
  preview     : (page: number) => `Así se verá la página ${page}`,
  button      : 'Numerar páginas',
  badStart    : (total: number) => `Elige una página entre 1 y ${formatCount(total)}`,
  badNumber   : 'El número tiene que ser 1 o más',
  page        : (number: number) => `Página ${number}`,
  ofTotal     : (number: number, last: number) => `${number} de ${last}`,
};

export const NUMBER_POSITION_LABELS: Record<NumberPosition, string> = {
  'bottom-center' : 'Abajo al centro',
  'bottom-right'  : 'Abajo a la derecha',
  'top-right'     : 'Arriba a la derecha',
};

// Examples for a 12-page PDF, as the person reads them.
export const NUMBER_FORMAT_LABELS: Record<NumberFormat, string> = {
  number     : '1',
  page       : 'Página 1',
  'of-total' : '1 de 12',
};

export const DEFAULT_NUMBERING: NumberingOptions = { position: 'bottom-center', format: 'number', startPage: 1, firstNumber: 1 };

// Same values as Rust (services/pdf/numbering.rs): font size and margin in points.
export const NUMBER_FONT_SIZE = 10;
export const NUMBER_MARGIN    = 28;

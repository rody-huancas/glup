import { NUMBERING_TEXTS } from '@/modules/pdf/constants/numbering';
import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import type { NumberFormat } from '@/modules/pdf/types/numbering';

interface NumberingProblemParams {
  options : NumberingOptions;
  // Pages in the PDF; null while it is not known yet.
  total   : number | null;
}

interface PageLabelParams {
  format : NumberFormat;
  number : number;
  last   : number;
}

// A whole number typed in a field, or null for anything else ("", "2,5", "-1").
export const parseWhole = (text: string): number | null => (/^\d{1,5}$/.test(text.trim()) ? Number(text.trim()) : null);

// The number shown on the last page, for "1 de 12".
export const lastNumber = ({ startPage, firstNumber }: NumberingOptions, total: number): number => firstNumber + (total - startPage);

export const pageLabel = ({ format, number, last }: PageLabelParams): string => {
  if (format === 'page') return NUMBERING_TEXTS.page(number);
  if (format === 'of-total') return NUMBERING_TEXTS.ofTotal(number, last);
  return String(number);
};

// Why "Numerar páginas" cannot go on, or null.
export const numberingProblem = ({ options, total }: NumberingProblemParams): string | null => {
  const pages = total ?? Infinity;
  if (!Number.isInteger(options.startPage) || options.startPage < 1 || options.startPage > pages) return NUMBERING_TEXTS.badStart(total ?? 1);
  if (!Number.isInteger(options.firstNumber) || options.firstNumber < 1) return NUMBERING_TEXTS.badNumber;
  return null;
};

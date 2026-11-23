import { MIN_PAGE_LETTERS } from '@/modules/text/constants/text';

// What pdf.js gives for each piece of text on a page.
interface TextItem {
  str     : string;
  hasEOL? : boolean;
}

// The selectable text of a page, with its line breaks.
export const textFromItems = (items: unknown[]): string =>
  items
    .filter((item): item is TextItem => typeof item === 'object' && item !== null && 'str' in item)
    .map((item) => `${item.str}${item.hasEOL ? '\n' : ''}`)
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

// A page that already carries text; the rest are scanned and go through the OCR.
export const hasSelectableText = (text: string): boolean => (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= MIN_PAGE_LETTERS;

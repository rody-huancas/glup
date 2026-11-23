import { TEXT_PREVIEW_LENGTH } from '@/modules/history/constants/history';

// The start of a copied text, on one line: "Hola, te escribo para…".
export const textPreview = (text: string, length: number = TEXT_PREVIEW_LENGTH): string => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > length ? `${line.slice(0, length).trimEnd()}…` : line;
};

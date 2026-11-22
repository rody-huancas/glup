import { RANGE_ERRORS } from '@/modules/pdf/constants/pdf';
import type { PageRangesResult } from '@/modules/pdf/interfaces/pageRanges';

interface ParseRangesParams {
  text  : string;
  total : number;
}

const RANGE_PATTERN = /^(\d+)\s*-\s*(\d+)$/;
const PAGE_PATTERN  = /^\d+$/;

const expand = (part: string): number[] | null => {
  if (PAGE_PATTERN.test(part)) return [Number(part)];

  const match = RANGE_PATTERN.exec(part);
  if (!match) return null;

  const [start, end] = [Number(match[1]), Number(match[2])];
  const step         = start <= end ? 1 : -1;

  return Array.from({ length: Math.abs(end - start) + 1 }, (_, index) => start + index * step);
};

// "1-3, 5, 8-10" → [1, 2, 3, 5, 8, 9, 10], in the order written, without repeats.
export const parsePageRanges = ({ text, total }: ParseRangesParams): PageRangesResult => {
  const parts = text.split(/[,;]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { pages: null, error: RANGE_ERRORS.empty };

  const pages: number[] = [];

  for (const part of parts) {
    const expanded = expand(part);
    if (!expanded) return { pages: null, error: RANGE_ERRORS.invalid(part) };

    const missing = expanded.find((page) => page < 1 || page > total);
    if (missing !== undefined) return { pages: null, error: RANGE_ERRORS.missing(missing, total) };

    expanded.forEach((page) => {
      if (!pages.includes(page)) pages.push(page);
    });
  }

  return { pages, error: null };
};

// [1, 2, 3, 5, 8, 9, 10] → "1-3, 5, 8-10" (consecutive runs collapse, order is kept).
export const formatPageRanges = (pages: number[]): string => {
  const parts: string[] = [];
  let index             = 0;

  while (index < pages.length) {
    const start = pages[index];
    let end     = start;

    while (index + 1 < pages.length && pages[index + 1] === end + 1) {
      index += 1;
      end    = pages[index];
    }

    parts.push(start === end ? String(start) : `${start}-${end}`);
    index += 1;
  }

  return parts.join(', ');
};

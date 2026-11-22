import { useCallback, useState } from 'react';
import { formatPageRanges, parsePageRanges } from '@/modules/pdf/utils/pageRanges';

// Clicked pages and the text field stay in sync; a bad text keeps the last valid selection and shows why.
export const usePageSelection = (total: number) => {
  const [pages, setPages] = useState<number[]>([]);
  const [text, setText]   = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((page: number) => {
    setPages((current) => {
      const next = current.includes(page) ? current.filter((item) => item !== page) : [...current, page];
      setText(formatPageRanges(next));
      setError(null);
      return next;
    });
  }, []);

  const write = useCallback((value: string) => {
    setText(value);

    if (!value.trim()) {
      setPages([]);
      setError(null);
      return;
    }

    const parsed = parsePageRanges({ text: value, total });

    if (parsed.error === null) {
      setPages(parsed.pages);
      setError(null);
    } else {
      setError(parsed.error);
    }
  }, [total]);

  return { pages, text, error, valid: error === null && pages.length > 0, toggle, write };
};

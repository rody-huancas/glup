import { useMemo, useState } from 'react';
import { parseTargetMb } from '@/modules/pdf/utils/targetSize';

// The optional "pese menos de" field: its text, the bytes it means and whether it can be used.
export const useTargetSize = () => {
  const [text, setText] = useState('');
  const bytes           = useMemo(() => parseTargetMb(text), [text]);

  return {
    text,
    write : setText,
    bytes : bytes ?? null,
    valid : bytes !== undefined,
  };
};

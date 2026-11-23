import { describe, expect, it } from 'vitest';
import { toTextResult } from '@/modules/text/utils/textResult';

const destination = { mode: 'same' as const, folder: null };

describe('text result', () => {
  it('carries the text and what saving it needs', () => {
    const result = toTextResult({ report: { text: 'Hola Glup', pages: 3, written: 2, entryId: 'e1' }, paths: ['C:/docs/contrato.pdf'], destination, cancelled: false });
    expect(result.tone).toBe('success');
    expect(result.message).toBe('Texto sacado · 3 páginas');
    expect(result.text).toEqual({ text: 'Hola Glup', paths: ['C:/docs/contrato.pdf'], destination, entryId: 'e1' });
  });

  it('says so, with Glup confused, when there was no text', () => {
    const result = toTextResult({ report: { text: '  ', pages: 1, written: 0, entryId: null }, paths: ['C:/fotos/gato.jpg'], destination, cancelled: false });
    expect(result.tone).toBe('failed');
    expect(result.message).toBe('No encontré texto en esto');
    expect(result.text).toBeUndefined();
  });

  it('one page is singular', () => {
    expect(toTextResult({ report: { text: 'x', pages: 1, written: 1, entryId: null }, paths: [], destination, cancelled: false }).message).toBe('Texto sacado · 1 página');
  });
});

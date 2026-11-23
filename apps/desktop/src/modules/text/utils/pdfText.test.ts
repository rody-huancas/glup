import { describe, expect, it } from 'vitest';
import { hasSelectableText, textFromItems } from '@/modules/text/utils/pdfText';

describe('pdf page text', () => {
  it('joins the pieces with their line breaks', () => {
    const items = [{ str: 'Contrato de', hasEOL: false }, { str: ' alquiler', hasEOL: true }, { str: 'Primera cláusula  ', hasEOL: true }, { type: 'beginMarkedContent' }];
    expect(textFromItems(items)).toBe('Contrato de alquiler\nPrimera cláusula');
  });

  it('a scanned page has no text (or only a few stray marks)', () => {
    expect(hasSelectableText('')).toBe(false);
    expect(hasSelectableText('12 - 3 · · ·')).toBe(false);
    expect(hasSelectableText('Contrato de alquiler entre las partes')).toBe(true);
    expect(hasSelectableText('ñandúes y pingüinos del sur')).toBe(true);
  });
});

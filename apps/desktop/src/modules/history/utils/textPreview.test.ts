import { describe, expect, it } from 'vitest';
import { textPreview } from '@/modules/history/utils/textPreview';

describe('textPreview', () => {
  it('puts the start of the text on one line', () => {
    expect(textPreview('Hola\n\nmundo  feliz', 40)).toBe('Hola mundo feliz');
  });

  it('cuts a long text with "…"', () => {
    expect(textPreview('Una frase bastante larga para la fila', 16)).toBe('Una frase bastan…');
  });
});

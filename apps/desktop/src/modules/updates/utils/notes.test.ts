import { describe, expect, it } from 'vitest';
import { noteLines } from '@/modules/updates/utils/notes';

describe('noteLines', () => {
  it('drops list marks, headings, bold and empty lines', () => {
    const notes = '## Novedades\r\n\r\n- **Herramientas**: el catálogo completo\n* Quitar fondo más rápido\n1. Arreglos en la isla\n';
    expect(noteLines(notes)).toEqual(['Novedades', 'Herramientas: el catálogo completo', 'Quitar fondo más rápido', 'Arreglos en la isla']);
  });

  it('gives nothing for empty notes', () => {
    expect(noteLines('  \n ')).toEqual([]);
  });
});

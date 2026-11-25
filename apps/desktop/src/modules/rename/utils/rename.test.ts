import { describe, expect, it } from 'vitest';
import { changeOf, moveItem, newRule } from '@/modules/rename/utils/rename';

describe('Renombrar en lote on the screen', () => {
  it('starts each rule with something that works', () => {
    expect(newRule('number')).toEqual({ kind: 'number', text: 'Foto {n}', digits: 3, start: 1, step: 1 });
    expect(newRule('date')).toMatchObject({ format: 'YYYY-MM-DD', side: 'start' });
  });

  it('moves a file or a rule to another place', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a'], 0, 3)).toEqual(['a']);
  });

  it('highlights only what changes in the name', () => {
    expect(changeOf('IMG_4512.jpg', 'Viaje 001.jpg')).toEqual({ same: '', changed: 'Viaje 001', tail: '.jpg' });
    expect(changeOf('tesis.docx', 'tesis (final).docx')).toEqual({ same: 'tesis', changed: ' (final)', tail: '.docx' });
    expect(changeOf('a.txt', 'a.txt')).toEqual({ same: 'a.txt', changed: '', tail: '' });
  });
});

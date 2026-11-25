import { describe, expect, it } from 'vitest';
import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import { fileName, filterGroups, folderOf, kindOf, rootOf } from '@/modules/duplicates/utils/filters';

const group = (id: number, paths: string[]): DuplicateGroup => ({ id, kind: 'same', files: paths.map((path) => ({ path, size: 1, modified: 0 })), keep: 0, quit: [1], review: false, freeable: 1 });

describe('the filters of the groups', () => {
  it('know the kind of a file and its folder', () => {
    expect(kindOf('C:\\Fotos\\IMG_1.HEIC')).toBe('photos');
    expect(kindOf('C:/a/peli.mkv')).toBe('videos');
    expect(kindOf('C:/a/contrato.PDF')).toBe('documents');
    expect(kindOf('C:/a/instalador.exe')).toBe('other');
    expect(folderOf('C:\\Users\\Ana\\Fotos\\a.jpg')).toBe('C:\\Users\\Ana\\Fotos');
    expect(fileName('C:\\Users\\Ana\\Fotos\\a.jpg')).toBe('a.jpg');
    expect(rootOf('C:\\Users\\Ana\\Downloads\\a.jpg', ['C:\\Users\\Ana', 'C:\\Users\\Ana\\Downloads'])).toBe('C:\\Users\\Ana\\Downloads');
    expect(rootOf('C:\\Otra\\a.jpg', ['C:\\Users\\Ana'])).toBeNull();
  });

  it('keep the groups of that type with a copy in that folder', () => {
    const photos = group(1, ['C:\\Downloads\\a.jpg', 'C:\\Pictures\\a.jpg']);
    const pdfs   = group(2, ['C:\\Documents\\b.pdf', 'C:\\Documents\\old\\b.pdf']);
    expect(filterGroups({ groups: [photos, pdfs], kind: 'photos', root: null })).toEqual([photos]);
    expect(filterGroups({ groups: [photos, pdfs], kind: 'all', root: 'C:\\Documents' })).toEqual([pdfs]);
    expect(filterGroups({ groups: [photos, pdfs], kind: 'videos', root: null })).toEqual([]);
  });
});

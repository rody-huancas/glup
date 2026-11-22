import { describe, expect, it } from 'vitest';
import { fileNameOf, folderOf, formatItemDate } from '@/modules/cleanup/utils/itemText';

describe('item texts', () => {
  it('splits Windows paths', () => {
    expect(fileNameOf('C:\\Users\\ana\\Downloads\\setup.exe')).toBe('setup.exe');
    expect(folderOf('C:\\Users\\ana\\Downloads\\setup.exe')).toBe('C:\\Users\\ana\\Downloads');
  });

  it('writes dates as dd/mm/aaaa, empty when unknown', () => {
    expect(formatItemDate(new Date(2026, 0, 5).getTime())).toBe('05/01/2026');
    expect(formatItemDate(0)).toBe('');
  });
});

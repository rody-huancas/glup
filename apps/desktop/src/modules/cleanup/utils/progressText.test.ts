import { describe, expect, it } from 'vitest';
import { cleaningLabel, groupThousands } from '@/modules/cleanup/utils/progressText';

describe('the progress of a cleaning', () => {
  it('writes big counts with a dot every three figures', () => {
    expect(groupThousands(7)).toBe('7');
    expect(groupThousands(1240)).toBe('1.240');
    expect(groupThousands(8300)).toBe('8.300');
    expect(groupThousands(1234567)).toBe('1.234.567');
  });

  it('counts the files as they go, and says the general words otherwise', () => {
    expect(cleaningLabel({ current: 1240, total: 8300, name: '' })).toBe('Borrando 1.240 de 8.300…');
    expect(cleaningLabel({ current: 0, total: 0, name: '' })).toBe('Liberando espacio…');
    expect(cleaningLabel({ current: 0, total: 41, name: 'Papelera de reciclaje' })).toBe('Liberando espacio…');
  });
});

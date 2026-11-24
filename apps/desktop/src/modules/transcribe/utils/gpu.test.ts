import { describe, expect, it } from 'vitest';
import { engineLine } from '@/modules/transcribe/utils/gpu';

describe('graphics card line', () => {
  it('says which one listens, in plain words', () => {
    expect(engineLine({ kind: 'gpu', name: 'NVIDIA GeForce RTX 4050 Laptop GPU' })).toBe('Escucho con la tarjeta de video: NVIDIA GeForce RTX 4050 Laptop GPU.');
    expect(engineLine({ kind: 'chosen' })).toBe('Escucho con el procesador, como elegiste.');
    expect(engineLine({ kind: 'noCard' })).toContain('no encontré una tarjeta de video');
    expect(engineLine({ kind: 'blocked', name: 'Intel(R) UHD Graphics' })).toContain('Intel(R) UHD Graphics falló la última vez');
    expect(engineLine({ kind: 'blocked', name: '' })).toContain('la tarjeta de video falló');
  });
});

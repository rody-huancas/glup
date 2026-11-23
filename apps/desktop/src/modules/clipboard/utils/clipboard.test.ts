import { describe, expect, it } from 'vitest';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import { nextClipIndex } from '@/modules/clipboard/utils/clipNavigation';
import { clipMeta, clipName, pauseTime } from '@/modules/clipboard/utils/clipView';
import { addProgram, programFile, removeProgram } from '@/modules/clipboard/utils/programs';

const NOW  = new Date('2026-11-23T15:00:00');
const TEXT: Clip = { id: 'a', kind: 'text', preview: 'Hola\nmundo', width: 0, height: 0, source: 'Bloc de notas', date: '2026-11-23T14:58:00', pinned: false };

describe('clip lines', () => {
  it('say where it came from and when', () => {
    expect(clipMeta(TEXT, NOW)).toBe('Bloc de notas · hace 2 min');
    expect(clipMeta({ ...TEXT, source: null }, NOW)).toBe('hace 2 min');
  });

  it('an image says its size', () => {
    expect(clipMeta({ ...TEXT, kind: 'image', preview: '', width: 1920, height: 1080, source: null }, NOW)).toBe('Imagen · 1920 × 1080 · hace 2 min');
  });

  it('have a short name for screen readers', () => {
    expect(clipName(TEXT)).toBe('Hola mundo');
    expect(clipName({ ...TEXT, kind: 'image' })).toBe('la imagen');
    expect(clipName({ ...TEXT, preview: 'a'.repeat(60) }).endsWith('…')).toBe(true);
  });

  it('the pause ends at a clock time', () => {
    expect(pauseTime('2026-11-23T09:05:00')).toBe('09:05');
  });
});

describe('nextClipIndex', () => {
  it('moves with the arrows and stops at the ends', () => {
    expect(nextClipIndex({ current: -1, count: 3, key: 'ArrowDown' })).toBe(0);
    expect(nextClipIndex({ current: 2, count: 3, key: 'ArrowDown' })).toBe(2);
    expect(nextClipIndex({ current: 0, count: 3, key: 'ArrowUp' })).toBe(-1);
    expect(nextClipIndex({ current: 1, count: 3, key: 'Home' })).toBe(0);
    expect(nextClipIndex({ current: 0, count: 3, key: 'End' })).toBe(2);
  });

  it('ignores other keys and an empty list', () => {
    expect(nextClipIndex({ current: 0, count: 3, key: 'a' })).toBeNull();
    expect(nextClipIndex({ current: -1, count: 0, key: 'ArrowDown' })).toBeNull();
  });
});

describe('excluded programs', () => {
  it('keep the file name of what was picked', () => {
    expect(programFile('C:\\Program Files\\Banco\\Banco.exe')).toBe('Banco.exe');
  });

  it('are listed once, in order, whatever the capitals', () => {
    expect(addProgram(['zoom.exe'], 'Banco.exe')).toEqual(['Banco.exe', 'zoom.exe']);
    expect(addProgram(['Banco.exe'], 'banco.EXE')).toEqual(['Banco.exe']);
    expect(removeProgram(['Banco.exe', 'zoom.exe'], 'zoom.exe')).toEqual(['Banco.exe']);
  });
});

import { describe, expect, it } from 'vitest';
import { formatTime, keyframeBefore, moveEdge, parseTime } from '@/modules/media/utils/time';

describe('the times of a cut', () => {
  it('are written and read as minutes, seconds and tenths', () => {
    expect(formatTime(65.34)).toBe('1:05.3');
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(3725.5)).toBe('1:02:05.5');
    expect(parseTime('1:05.3')).toBeCloseTo(65.3);
    expect(parseTime('65,5')).toBeCloseTo(65.5);
    expect(parseTime('1:02:05')).toBe(3725);
    expect(parseTime('1:aa')).toBeNull();
    expect(parseTime('')).toBeNull();
  });

  it('keep the stretch inside the file and its ends apart', () => {
    const stretch = { start: 10, end: 20 };
    expect(moveEdge({ stretch, which: 'start', to: 25, duration: 60 })).toEqual({ start: 19.9, end: 20 });
    expect(moveEdge({ stretch, which: 'start', to: -3, duration: 60 })).toEqual({ start: 0, end: 20 });
    expect(moveEdge({ stretch, which: 'end', to: 5, duration: 60 })).toEqual({ start: 10, end: 10.1 });
    expect(moveEdge({ stretch, which: 'end', to: 90, duration: 60 })).toEqual({ start: 10, end: 60 });
  });

  it('say where a fast cut of a video starts', () => {
    expect(keyframeBefore([0, 2, 4, 6], 5.3)).toBe(4);
    expect(keyframeBefore([0, 2, 4, 6], 4)).toBe(4);
    expect(keyframeBefore([], 3)).toBe(0);
  });
});

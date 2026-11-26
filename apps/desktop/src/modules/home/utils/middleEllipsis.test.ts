import { describe, expect, it } from 'vitest';
import { middleEllipsis } from '@/modules/home/utils/middleEllipsis';

describe('a long name', () => {
  it('is cut in the middle and keeps its end', () => {
    expect(middleEllipsis('WhatsApp Video 2026-11-20 at 21.13.05.mp4', 22)).toBe('WhatsApp Vid…13.05.mp4');
    expect(middleEllipsis('foto.jpg', 22)).toBe('foto.jpg');
    expect(middleEllipsis('WhatsApp Video 2026-11-20 at 21.13.05.mp4', 22)).toHaveLength(22);
  });
});

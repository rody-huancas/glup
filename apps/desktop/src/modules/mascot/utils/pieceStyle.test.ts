import { describe, expect, it } from 'vitest';
import { getPeekLayerStyle, getPieceStyle } from '@/modules/mascot/utils/pieceStyle';

describe('the peeking Glup', () => {
  it('moves the face from the whole spot to the peeking one with --peek', () => {
    const eye = getPieceStyle('eye-left');
    expect(eye.left).toBe('calc(35.137% + 1.251% * var(--peek, 0))');
    expect(eye.width).toBe('calc(11.28% + -2.503% * var(--peek, 0))');
  });

  it('leaves arms, feet and held files where they are (they fade with the body)', () => {
    expect(getPieceStyle('arm-left').left).toBe('8.537%');
    expect(getPieceStyle('file-pdf').top).toBe('62.706%');
  });

  it('shows the peek layer only as --peek grows (nothing anywhere else)', () => {
    expect(getPeekLayerStyle().opacity).toBe('var(--peek, 0)');
  });
});

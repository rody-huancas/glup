import { describe, expect, it } from 'vitest';
import { dockLabel, isCorner, nudgeDock, offsetPercent, withOffset } from '@/modules/dock/utils/dockNudge';

const top  = { edge: 'top' as const, offset: 0.5, screen: null };
const left = { edge: 'left' as const, offset: 0.5, screen: null };

describe('the position along the edge', () => {
  it('moves with the arrows along the edge, more with Shift', () => {
    expect(nudgeDock({ dock: top, key: 'ArrowRight', big: false })?.offset).toBe(0.52);
    expect(nudgeDock({ dock: top, key: 'ArrowLeft', big: true })?.offset).toBe(0.4);
    expect(nudgeDock({ dock: left, key: 'ArrowDown', big: false })?.offset).toBe(0.52);
    expect(nudgeDock({ dock: left, key: 'ArrowUp', big: false })?.offset).toBe(0.48);
  });

  it('ignores the arrows across the edge, corners and the ends', () => {
    expect(nudgeDock({ dock: top, key: 'ArrowUp', big: false })).toBeNull();
    expect(nudgeDock({ dock: left, key: 'ArrowRight', big: false })).toBeNull();
    expect(nudgeDock({ dock: { ...top, edge: 'top-left' }, key: 'ArrowRight', big: false })).toBeNull();
    expect(nudgeDock({ dock: { ...top, offset: 1 }, key: 'ArrowRight', big: false })).toBeNull();
    expect(nudgeDock({ dock: { ...top, offset: 0.01 }, key: 'ArrowLeft', big: false })?.offset).toBe(0);
  });

  it('goes to and from the slider\'s percent, within 0 and 100', () => {
    expect(offsetPercent({ ...top, offset: 0.333 })).toBe(33);
    expect(withOffset(top, 80).offset).toBe(0.8);
    expect(withOffset(top, 140).offset).toBe(1);
    expect(withOffset(top, -5).offset).toBe(0);
    expect(isCorner('bottom-right')).toBe(true);
    expect(isCorner('bottom')).toBe(false);
  });

  it('says where it goes while it moves', () => {
    expect(dockLabel({ ...top, offset: 0.35 })).toBe('Arriba · 35 %');
    expect(dockLabel({ ...left, offset: 1 })).toBe('Izquierda · 100 %');
    expect(dockLabel({ ...top, edge: 'bottom-right' })).toBe('Abajo a la derecha');
  });
});

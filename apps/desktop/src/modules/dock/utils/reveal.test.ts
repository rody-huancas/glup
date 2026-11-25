import { describe, expect, it } from 'vitest';
import { DEFAULT_REVEAL_DELAY } from '@/modules/dock/constants/dock';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { dockRegion, isClickable, revealZone } from '@/modules/dock/utils/dockLayout';
import { dockShape, placeIsland } from '@/modules/dock/utils/placement';
import { competesWithTaskbar, revealDelay } from '@/modules/dock/utils/reveal';

const WORK  = { width: 1920, height: 1040 };
const place = (edge: DockEdge, rest: 'pill' | 'hidden' = 'hidden') => placeIsland({ dock: { edge, offset: 0.5, screen: null }, work: WORK, rest });

describe('the reveal zone of a hidden Glup', () => {
  it('is a thin strip against its edge, where the pill would be', () => {
    expect(revealZone(place('top'))).toEqual({ x: 513, y: 0, width: 174, height: 2 });

    const bottom = place('bottom');
    const zone   = revealZone(bottom);
    expect(zone.y + zone.height).toBe(bottom.frame.height);
    expect(zone.height).toBe(2);
  });

  it('stands against a side edge and sits in the very corner', () => {
    const right = place('right');
    const zone  = revealZone(right);
    expect(zone.x + zone.width).toBe(right.frame.width);
    expect(zone.width).toBe(2);
    expect(zone.height).toBeGreaterThan(100);

    expect(revealZone(place('top-left'))).toEqual({ x: 0, y: 0, width: 24, height: 24 });
  });

  it('is the resting region, and takes no clicks; open, the panel does', () => {
    const hidden = place('left');
    expect(dockRegion(hidden, 'collapsed')).toEqual(revealZone(hidden));
    expect(isClickable(hidden, 'collapsed')).toBe(false);
    expect(isClickable(hidden, 'expanded')).toBe(true);
    expect(isClickable(place('left', 'pill'), 'collapsed')).toBe(true);
  });

  it('has nothing to show at rest: the panel grows from the edge itself', () => {
    const hidden = place('top');
    expect(dockShape(hidden, 'collapsed')).toEqual({ width: 0, height: 0, earRadius: 0, bottomRadius: 0, shift: 0 });
    expect(dockShape(hidden, 'hover').width).toBe(0);
    expect(dockShape(hidden, 'expanded').width).toBe(1040);
    expect(dockShape(place('top', 'pill'), 'collapsed').width).toBe(150);
    expect(dockShape(place('bottom', 'pill'), 'collapsed').width).toBe(148);
  });
});

describe('revealDelay', () => {
  it('uses the default until one is chosen, and keeps it within the choices', () => {
    expect(revealDelay(null)).toBe(DEFAULT_REVEAL_DELAY);
    expect(revealDelay(500)).toBe(500);
    expect(revealDelay(0)).toBe(150);
    expect(revealDelay(99_999)).toBe(800);
    expect(revealDelay(Number.NaN)).toBe(DEFAULT_REVEAL_DELAY);
  });
});

describe('competesWithTaskbar', () => {
  const bottomAutohide = { autohide: true, edge: 'bottom' as const };

  it('a taskbar that hides by itself on the same edge (or a corner of it) competes', () => {
    expect(competesWithTaskbar('bottom', bottomAutohide)).toBe(true);
    expect(competesWithTaskbar('bottom-right', bottomAutohide)).toBe(true);
    expect(competesWithTaskbar('top', bottomAutohide)).toBe(false);
    expect(competesWithTaskbar('top-left', bottomAutohide)).toBe(false);
  });

  it('a taskbar always shown does not: Glup sits above it', () => {
    expect(competesWithTaskbar('bottom', { autohide: false, edge: 'bottom' })).toBe(false);
    expect(competesWithTaskbar('bottom', null)).toBe(false);
  });
});

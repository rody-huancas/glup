import { describe, expect, it } from 'vitest';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { bodyBox, buildDockOutline, buildDockPath, mapPoint, shapeBox } from '@/modules/dock/utils/dockGeometry';
import { dockShape, placeIsland } from '@/modules/dock/utils/placement';

const WORK  = { width: 1920, height: 1040 };
const place = (edge: DockEdge) => placeIsland({ dock: { edge, offset: 0.5, screen: null }, work: WORK });

// The sweep flags of every arc, in order.
const sweeps = (path: string): string[] => [...path.matchAll(/A [\d.]+ [\d.]+ 0 0 (\d)/g)].map((match) => match[1]);

describe('dock geometry', () => {
  it('on top it draws the pill of always, centered in the window', () => {
    const placement = place('top');
    const path      = buildDockPath(placement, dockShape(placement, 'collapsed'));

    expect(path.startsWith('M 514 0 L 686 0 A 12 12 0 0 0 674 12 L 674 18 A 14 14 0 0 1 660 32')).toBe(true);
    expect(path.endsWith('A 12 12 0 0 0 514 0 Z')).toBe(true);
  });

  it('at the bottom it is the same pill mirrored, so every arc turns the other way', () => {
    const top    = place('top');
    const bottom = place('bottom');
    const flip   = (flags: string[]) => flags.map((flag) => (flag === '1' ? '0' : '1'));

    expect(sweeps(buildDockPath(bottom, dockShape(bottom, 'collapsed')))).toEqual(flip(sweeps(buildDockPath(top, dockShape(top, 'collapsed')))));
    expect(bodyBox(bottom, dockShape(bottom, 'collapsed')).y).toBe(bottom.frame.height - 46 + 14);
  });

  it('on the sides it stands against its edge', () => {
    const left = place('left');
    const box  = shapeBox(left, dockShape(left, 'collapsed'));

    expect(box.x).toBe(0);
    expect(box.width).toBe(46);
    expect(box.height).toBe(112 + 24);
    expect(mapPoint(left, 10, 0)).toEqual({ x: 0, y: 10 });
  });

  it('in a corner it leans on both edges, with an ear on each', () => {
    const corner = place('top-right');
    const box    = shapeBox(corner, dockShape(corner, 'collapsed'));

    expect(box.x + box.width).toBe(corner.frame.width);
    expect(box.y).toBe(0);
    expect(box.width).toBe(72);
    expect(box.height).toBe(72);
    expect(sweeps(buildDockPath(corner, dockShape(corner, 'collapsed')))).toHaveLength(3);
  });

  it('the border is left open along the screen edges', () => {
    const placement = place('top');
    const outline   = buildDockOutline(placement, dockShape(placement, 'expanded'));

    expect(outline.startsWith('M 62 0 A')).toBe(true);
    expect(outline.includes('Z')).toBe(false);
  });

  it('never draws broken radii while the shape squashes to nothing', () => {
    for (const edge of ['top', 'left', 'bottom-left'] as DockEdge[]) {
      const placement = place(edge);
      const path      = buildDockPath(placement, { width: 4, height: 2, earRadius: 18, bottomRadius: 26, shift: 0 });
      expect(path.includes('NaN')).toBe(false);
      expect(path.includes('-')).toBe(false);
    }
  });
});

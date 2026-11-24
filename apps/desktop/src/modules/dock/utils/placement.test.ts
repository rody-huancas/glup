import { describe, expect, it } from 'vitest';
import { DOCK_EDGES } from '@/modules/dock/constants/dock';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { contentBox, dockRegion } from '@/modules/dock/utils/dockLayout';
import { alongLength, dockShape, offsetAt, pillCenter, placeIsland } from '@/modules/dock/utils/placement';
import type { Rect } from '@/shared/interfaces/rect';

const WORK   = { width: 1920, height: 1040 };
const SMALL  = { width: 1280, height: 680 };
const BORDER = 1;

const place = (edge: DockEdge, offset = 0.5, work = WORK): IslandPlacement => placeIsland({ dock: { edge, offset, screen: null }, work });

// A rect of the window, on the work area.
const onWork = (placement: IslandPlacement, rect: Rect): Rect => ({ ...rect, x: rect.x + placement.frame.x, y: rect.y + placement.frame.y });

const within = (rect: Rect, outer: { width: number; height: number }): boolean =>
  rect.x >= -0.01 && rect.y >= -0.01 && rect.x + rect.width <= outer.width + 0.01 && rect.y + rect.height <= outer.height + 0.01;

describe('placeIsland', () => {
  it('on top in the middle, the window is the one of always: 1200 x 720, centered', () => {
    const placement = place('top');

    expect(placement.frame).toEqual({ x: 360, y: 0, width: 1200, height: 720 });
    expect(placement.along).toBe(600);
    expect(placement.shifts).toEqual({ expanded: 0, notice: 0 });
  });

  it('at the bottom it sits on the work area, above the taskbar', () => {
    const placement = place('bottom');
    expect(placement.frame.y + placement.frame.height).toBe(WORK.height);
    expect(placement.kind).toBe('horizontal');
  });

  it('on the sides the pill stands and the panel opens toward the middle', () => {
    const left  = place('left');
    const right = place('right');

    expect(left.kind).toBe('vertical');
    expect(left.frame.x).toBe(0);
    expect(right.frame.x + right.frame.width).toBe(WORK.width);
    expect(contentBox(left, BORDER).x).toBeCloseTo(0, 5);
    expect(contentBox(right, BORDER).x + contentBox(right, BORDER).width).toBeCloseTo(right.frame.width, 5);
  });

  it('in a corner it leans on both edges', () => {
    const placement = place('bottom-right');
    expect(placement.frame.x + placement.frame.width).toBe(WORK.width);
    expect(placement.frame.y + placement.frame.height).toBe(WORK.height);
    expect(placement.kind).toBe('corner');
  });

  it('near an end of the edge the panel slides to stay on screen, and the pill stays where it was put', () => {
    const placement = place('top', 0);
    const content   = onWork(placement, contentBox(placement, BORDER));

    expect(placement.shifts.expanded).toBeGreaterThan(0);
    expect(content.x).toBeGreaterThanOrEqual(0);
    expect(placement.frame.x + placement.along).toBe(alongLength(dockShape(placement, 'hover')) / 2);
  });

  it('the panel never leaves the screen, for any edge, spot or screen size', () => {
    for (const work of [WORK, SMALL]) {
      for (const edge of DOCK_EDGES) {
        for (const offset of [0, 0.25, 0.5, 0.75, 1]) {
          const placement = place(edge, offset, work);
          const content   = onWork(placement, contentBox(placement, BORDER));

          expect(within(placement.frame, work)).toBe(true);
          expect(within(content, work)).toBe(true);
          expect(within(dockRegion(placement, 'expanded'), placement.frame)).toBe(true);
          expect(within(dockRegion(placement, 'collapsed'), placement.frame)).toBe(true);
        }
      }
    }
  });

  it('turns an offset into a spot of the edge and back', () => {
    expect(pillCenter('top', 0.5, 1920)).toBe(960);
    expect(offsetAt('top', 960, 1920)).toBe(0.5);
    expect(offsetAt('left', pillCenter('left', 0.3, 1040), 1040)).toBeCloseTo(0.3, 6);
    expect(offsetAt('top', -50, 1920)).toBe(0);
  });
});

describe('dockRegion', () => {
  it('on top in the middle, the regions are the ones of always', () => {
    const placement = place('top');

    expect(dockRegion(placement, 'collapsed')).toEqual({ x: 508, y: 0, width: 184, height: 36 });
    expect(dockRegion(placement, 'expanded')).toEqual({ x: 62, y: 0, width: 1076, height: 640 });
    expect(dockRegion(placement, 'frame')).toEqual({ x: 0, y: 0, width: 1200, height: 720 });
  });

  it('a standing pill is taller than wide and stays against its edge', () => {
    const region = dockRegion(place('right'), 'collapsed');
    const frame  = place('right').frame;

    expect(region.height).toBeGreaterThan(region.width);
    expect(region.x + region.width).toBe(frame.width);
  });
});

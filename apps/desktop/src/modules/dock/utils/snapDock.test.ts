import { describe, expect, it } from 'vitest';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { dockAt, resolveDock, sameDock, snapDock } from '@/modules/dock/utils/snapDock';

// Main 1920 x 1080 at 100 % with the taskbar at the bottom; a 2560 x 1440 at 150 % on its left.
const MAIN: IslandScreen  = { id: 'DISPLAY1', primary: true, scale: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, work: { x: 0, y: 0, width: 1920, height: 1040 } };
const OTHER: IslandScreen = { id: 'DISPLAY2', primary: false, scale: 1.5, bounds: { x: -2560, y: 0, width: 2560, height: 1440 }, work: { x: -2560, y: 0, width: 2560, height: 1440 } };
const SCREENS             = [MAIN, OTHER];

describe('snapDock', () => {
  it('goes to the nearest edge, at the spot along it', () => {
    expect(snapDock({ point: { x: 960, y: 30 }, screens: SCREENS })).toEqual({ edge: 'top', offset: 0.5, screen: 'DISPLAY1' });
    expect(snapDock({ point: { x: 1900, y: 520 }, screens: SCREENS })?.edge).toBe('right');
    expect(snapDock({ point: { x: 960, y: 1000 }, screens: SCREENS })?.edge).toBe('bottom');
  });

  it('near two edges at once it goes into the corner', () => {
    expect(snapDock({ point: { x: 30, y: 20 }, screens: SCREENS })?.edge).toBe('top-left');
    expect(snapDock({ point: { x: 1890, y: 1030 }, screens: SCREENS })?.edge).toBe('bottom-right');
  });

  it('the bottom edge is the one of the work area: the taskbar does not count', () => {
    expect(snapDock({ point: { x: 960, y: 1075 }, screens: SCREENS })?.edge).toBe('bottom');
  });

  it('moves to another screen, with that screen\'s scale', () => {
    const dock = snapDock({ point: { x: -1280, y: 10 }, screens: SCREENS });
    expect(dock).toEqual({ edge: 'top', offset: 0.5, screen: 'DISPLAY2' });
  });

  it('a cursor between screens goes to the nearest one', () => {
    expect(snapDock({ point: { x: 2100, y: 500 }, screens: SCREENS })?.screen).toBe('DISPLAY1');
    expect(snapDock({ point: { x: 0, y: 0 }, screens: [] })).toBeNull();
  });
});

describe('dockAt', () => {
  it('a click on the drawing of Ajustes lands on the same docks', () => {
    expect(dockAt({ x: 960, y: 520 }, { width: 1920, height: 1040 }, null).edge).toBe('top');
    expect(dockAt({ x: 5, y: 600 }, { width: 1920, height: 1040 }, null).edge).toBe('left');
  });
});

describe('sameDock', () => {
  it('tells apart another edge, screen or spot, not a hair', () => {
    const dock = { edge: 'top' as const, offset: 0.5, screen: 'DISPLAY1' };

    expect(sameDock(dock, { ...dock, offset: 0.50001 })).toBe(true);
    expect(sameDock(dock, { ...dock, offset: 0.6 })).toBe(false);
    expect(sameDock(dock, { ...dock, edge: 'bottom' })).toBe(false);
    expect(sameDock(dock, { ...dock, screen: 'DISPLAY2' })).toBe(false);
  });
});

describe('resolveDock', () => {
  it('keeps a dock whose screen is there', () => {
    expect(resolveDock({ edge: 'left', offset: 0.3, screen: 'DISPLAY2' }, SCREENS)?.screen.id).toBe('DISPLAY2');
  });

  it('a screen that was unplugged gives way to the main one, at the same edge and spot', () => {
    const resolved = resolveDock({ edge: 'right', offset: 0.8, screen: 'DISPLAY9' }, SCREENS);
    expect(resolved?.dock).toEqual({ edge: 'right', offset: 0.8, screen: 'DISPLAY1' });
  });

  it('nothing saved or a broken value goes back to the top in the middle', () => {
    expect(resolveDock(null, SCREENS)?.dock).toEqual({ edge: 'top', offset: 0.5, screen: 'DISPLAY1' });
    expect(resolveDock({ edge: 'arriba' as never, offset: 0.5, screen: null }, SCREENS)?.dock.edge).toBe('top');
    expect(resolveDock({ edge: 'top', offset: 7, screen: null }, SCREENS)?.dock.offset).toBe(1);
    expect(resolveDock(null, [])).toBeNull();
  });
});

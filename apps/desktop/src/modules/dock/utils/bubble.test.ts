import { describe, expect, it } from 'vitest';
import { BUBBLE } from '@/modules/dock/constants/dock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { bubbleBox, bubbleCenter, dragBubble, fitBubble, placeBubble, resolveBubble, spotAt } from '@/modules/dock/utils/bubble';
import { dockRegion, isRound, noticeTextBox, pillBody } from '@/modules/dock/utils/dockLayout';
import { dockShape } from '@/modules/dock/utils/placement';
import type { Rect } from '@/shared/interfaces/rect';

const WORK  = { width: 1920, height: 1040 };
const REACH = BUBBLE.size / 2 + BUBBLE.pad + BUBBLE.margin;

const screen = (id: string, x: number, scale: number, primary = false): IslandScreen => ({
  id,
  primary,
  scale,
  bounds : { x, y: 0, width: 1920 * scale, height: 1080 * scale },
  work   : { x, y: 0, width: 1920 * scale, height: 1040 * scale },
});

const MAIN  = screen('main', 0, 1, true);
const RIGHT = screen('right', 1920, 1.5);

const at = (x: number, y: number) => placeBubble({ spot: { x: x / WORK.width, y: y / WORK.height, screen: null }, work: WORK });

const inScreen = (box: Rect): boolean => box.x >= 0 && box.y >= 0 && box.x + box.width <= WORK.width && box.y + box.height <= WORK.height;

describe('fitBubble', () => {
  it('leaves a bubble that fits where it was dropped, with no edge to stick to', () => {
    expect(fitBubble({ x: 700, y: 300 }, WORK)).toEqual({ x: 700, y: 300 });
  });

  it('brings one that was left partly out back inside, with its shadow and ring', () => {
    expect(fitBubble({ x: -40, y: 2000 }, WORK)).toEqual({ x: REACH, y: WORK.height - REACH });
    expect(fitBubble({ x: 1919, y: 3 }, WORK)).toEqual({ x: WORK.width - REACH, y: REACH });
  });
});

describe('where the panel and the notice go', () => {
  it('toward the larger room, and never out of the screen', () => {
    const spots = [at(60, 60), at(1860, 60), at(60, 980), at(1860, 980), at(960, 520)];

    spots.forEach((placement) => {
      expect(inScreen(bubbleBox(placement, dockShape(placement, 'expanded')))).toBe(true);
      expect(inScreen(bubbleBox(placement, dockShape(placement, 'notice')))).toBe(true);
    });

    expect(at(60, 60).bubble?.grow).toEqual({ x: 1, y: 1 });
    expect(at(1860, 980).bubble?.grow).toEqual({ x: -1, y: -1 });
  });

  it('opens from the bubble: the panel starts at its side when there is room', () => {
    const right = at(300, 200);
    const panel = bubbleBox(right, dockShape(right, 'expanded'));
    expect(panel.x).toBe(270);
    expect(panel.y).toBe(170);

    const left = at(1600, 800);
    const open = bubbleBox(left, dockShape(left, 'expanded'));
    expect(open.x + open.width).toBe(1630);
    expect(open.y + open.height).toBe(830);
  });

  it('the notice tab goes out to the side with room, the text between the bubble and its end', () => {
    const right  = at(300, 200);
    const tab    = bubbleBox(right, dockShape(right, 'notice'));
    const circle = pillBody(right);
    expect(tab.x).toBeLessThanOrEqual(circle.x);
    expect(tab.y).toBe(circle.y);
    expect(noticeTextBox(right, circle).x).toBeGreaterThan(circle.x + circle.width);

    const left = at(1800, 200);
    const text = noticeTextBox(left, pillBody(left));
    expect(text.x + text.width).toBeLessThan(pillBody(left).x);
  });

  it('the hover and the landing shake stay centered on the bubble', () => {
    const placement = at(500, 500);
    const hover     = bubbleBox(placement, dockShape(placement, 'hover'));
    const settle    = bubbleBox(placement, dockShape(placement, 'settle'));
    expect(hover.x + hover.width / 2).toBe(500);
    expect(settle.y + settle.height / 2).toBe(500);
  });
});

describe('the bubble region', () => {
  it('is round at rest, around the circle with room for its shadow and ring; open, the panel', () => {
    const placement = at(500, 400);
    expect(dockRegion(placement, 'collapsed')).toEqual({ x: 500 - 28 - BUBBLE.pad, y: 400 - 28 - BUBBLE.pad, width: 56 + BUBBLE.pad * 2, height: 56 + BUBBLE.pad * 2 });
    expect(isRound(placement, 'collapsed')).toBe(true);
    expect(isRound(placement, 'expanded')).toBe(false);
    expect(dockRegion(placement, 'expanded')).toEqual(bubbleBox(placement, dockShape(placement, 'expanded')));
  });

  it('while it opens, only the room the panel can reach, not the whole screen', () => {
    const placement = at(300, 200);
    const frame     = dockRegion(placement, 'frame');
    expect(frame.width).toBeLessThan(WORK.width);
    expect(frame.x).toBeLessThanOrEqual(dockRegion(placement, 'collapsed').x);
  });
});

describe('resolveBubble', () => {
  it('keeps the spot on its screen', () => {
    const resolved = resolveBubble({ x: 0.25, y: 0.5, screen: 'right' }, [MAIN, RIGHT]);
    expect(resolved?.screen.id).toBe('right');
    expect(resolved?.spot.x).toBeCloseTo(0.25);
  });

  it('a screen that is gone gives way to the main one, at the same relative spot', () => {
    expect(resolveBubble({ x: 0.25, y: 0.75, screen: 'right' }, [MAIN])).toEqual({ spot: { x: 0.25, y: 0.75, screen: 'main' }, screen: MAIN });
  });

  it('a smaller resolution keeps it inside the screen', () => {
    const small    = { ...MAIN, work: { x: 0, y: 0, width: 1280, height: 680 } };
    const resolved = resolveBubble({ x: 0.999, y: 0.999, screen: 'main' }, [small]);
    expect(resolved && bubbleCenter(resolved.spot, { width: 1280, height: 680 })).toEqual({ x: 1280 - REACH, y: 680 - REACH });
  });

  it('a broken value goes to the middle of the main screen', () => {
    expect(resolveBubble({ x: Number.NaN, y: 0.2, screen: null }, [RIGHT, MAIN])?.spot).toEqual({ x: 0.5, y: 0.5, screen: 'main' });
    expect(resolveBubble(null, [])).toBeNull();
  });
});

describe('dragBubble', () => {
  it('its middle follows the cursor where it was grabbed', () => {
    expect(dragBubble({ cursor: { x: 400, y: 300 }, grab: { x: 10, y: -5 }, screens: [MAIN, RIGHT] })).toEqual(spotAt({ x: 410, y: 295 }, WORK, 'main'));
  });

  it('goes to another screen with its own scale', () => {
    const spot = dragBubble({ cursor: { x: 1920 + 900, y: 600 }, grab: { x: 0, y: 0 }, screens: [MAIN, RIGHT] });
    expect(spot?.screen).toBe('right');
    expect(spot?.x).toBeCloseTo(600 / 1920);
    expect(spot?.y).toBeCloseTo(400 / 1040);
  });

  it('past every screen, it stays inside the nearest one', () => {
    const spot = dragBubble({ cursor: { x: -300, y: 500 }, grab: { x: 0, y: 0 }, screens: [MAIN, RIGHT] });
    expect(spot?.screen).toBe('main');
    expect(spot?.x).toBeCloseTo(REACH / WORK.width);
  });
});

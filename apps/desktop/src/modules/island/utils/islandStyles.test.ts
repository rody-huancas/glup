import { describe, expect, it } from 'vitest';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { pillBody } from '@/modules/dock/utils/dockLayout';
import { placeIsland } from '@/modules/dock/utils/placement';
import { getPillAnchorStyle } from '@/modules/island/utils/islandStyles';
import { PEEK_LAYER } from '@/modules/mascot/constants/peek';

const WORK  = { width: 1920, height: 1040 };
const place = (edge: DockEdge) => placeIsland({ dock: { edge, offset: 0.5, screen: null }, work: WORK, rest: 'pill' });
const px    = (value: string | number | undefined): number => parseFloat(String(value));

describe("Glup's spot in the pill", () => {
  it('on top, peeks out centered, its flat base on the pill lower edge and its headphones inside', () => {
    const placement = place('top');
    const body      = pillBody(placement);
    const style     = getPillAnchorStyle(placement);
    const [x, y, width, height] = [px(style.left), px(style.top), px(style.width), px(style.height)];

    const peekLeft   = x + (width * PEEK_LAYER.x) / 100;
    const peekWidth  = (width * PEEK_LAYER.w) / 100;
    const peekTop    = y + (height * PEEK_LAYER.y) / 100;
    const peekBottom = peekTop + (height * PEEK_LAYER.h) / 100;

    expect(peekLeft + peekWidth / 2).toBeCloseTo(body.x + body.width / 2, 5);
    expect(peekBottom).toBeCloseTo(body.y + body.height, 5);
    expect(peekTop).toBeGreaterThanOrEqual(body.y);
    expect(peekWidth).toBeLessThan(body.width);
  });

  it('the other edges keep the Glup of always', () => {
    const top    = getPillAnchorStyle(place('top'));
    const bottom = getPillAnchorStyle(place('bottom'));
    expect(px(bottom.width)).not.toBeCloseTo(px(top.width), 1);
  });
});

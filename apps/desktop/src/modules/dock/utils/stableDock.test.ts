import { describe, expect, it } from 'vitest';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import { keepDock, keepSpot } from '@/modules/dock/utils/stableDock';

describe('the saved place read again', () => {
  it('keeps its object while it is the same place', () => {
    const dock: IslandDock = { edge: 'top', offset: 0.5, screen: 'pantalla-1' };
    expect(keepDock(dock, { ...dock })).toBe(dock);
    expect(keepDock(null, null)).toBeNull();

    const moved = { ...dock, offset: 0.3 };
    expect(keepDock(dock, moved)).toBe(moved);
    expect(keepDock(dock, null)).toBeNull();
    expect(keepDock(null, dock)).toBe(dock);
  });

  it('does the same for the bubble', () => {
    const spot: BubbleSpot = { screen: 'pantalla-1', x: 0.9, y: 0.8 };
    expect(keepSpot(spot, { ...spot })).toBe(spot);
    const moved = { ...spot, y: 0.2 };
    expect(keepSpot(spot, moved)).toBe(moved);
  });
});

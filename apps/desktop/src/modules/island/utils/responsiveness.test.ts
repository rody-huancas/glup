import { describe, expect, it } from 'vitest';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { hoverOpens, INITIAL_MACHINE, islandReducer } from '@/modules/island/utils/islandMachine';
import { askedToOpen, isStuckDrag, isUnresponsive, UNRESPONSIVE_MS } from '@/modules/island/utils/responsiveness';

const run = (events: IslandEvent[], from: IslandMachine = INITIAL_MACHINE): IslandMachine => events.reduce(islandReducer, from);

const RESULT = { message: 'Liberaste 1,2 GB', tone: 'success' as const };

describe('an island that stops answering', () => {
  // What happened that night: Recoger with Limpieza running, its result arriving while collapsed, a
  // press on the notice that became a drag, and the drop that never arrived (the pointer could not be
  // read: the session locked). From then on it ignored hover and clicks.
  const night = run([
    { type: 'pointer', inside: true },
    { type: 'expand', pin: true },
    { type: 'settled', phase: 'expanded' },
    { type: 'collapse', farewell: true },
    { type: 'settled', phase: 'collapsed' },
    { type: 'pointer', inside: false },
    { type: 'notice', notice: RESULT },
    { type: 'pointer', inside: true },
    { type: 'moving', on: true },
  ]);

  it('reproduces it: being dragged forever, nothing opens it', () => {
    expect(night.moving).toBe(true);
    expect(hoverOpens(night)).toBe(false);
    expect(run([{ type: 'expand', pin: true }], night).phase).toBe('collapsed');
    expect(run([{ type: 'expand', pin: false }, { type: 'pointer', inside: false }, { type: 'pointer', inside: true }], night).phase).toBe('collapsed');
  });

  it('the watchdog sees the lost drop and its reset opens it again', () => {
    // Rust follows no drag, the webview still thinks so.
    expect(isStuckDrag(night, false)).toBe(true);
    expect(isStuckDrag(night, true)).toBe(false);

    const reset = run([{ type: 'reset' }], night);
    expect(reset.moving).toBe(false);
    expect(reset.phase).toBe('collapsed');
    const opened = run([{ type: 'pointer', inside: true }, { type: 'expand', pin: true }], reset);
    expect(opened.phase).toBe('expanding');
  });

  it('counts how long an opening is asked for and not done', () => {
    const resting = run([{ type: 'pointer', inside: true }]);
    expect(askedToOpen(resting)).toBe(true);
    // Closed with the cursor still over it: that is on purpose, nothing is asked.
    expect(askedToOpen(run([{ type: 'expand', pin: true }, { type: 'settled', phase: 'expanded' }, { type: 'collapse', farewell: true }, { type: 'settled', phase: 'collapsed' }], resting))).toBe(false);
    // Hidden at rest there is no pill to rest on; the bubble opens with a click, not by resting on it.
    expect(askedToOpen({ ...resting, rest: 'hidden' })).toBe(false);
    expect(askedToOpen({ ...resting, rest: 'bubble' })).toBe(false);

    expect(isUnresponsive({ askedAt: 1000, now: 1000 + UNRESPONSIVE_MS - 1, phase: 'collapsed', dragging: false })).toBe(false);
    expect(isUnresponsive({ askedAt: 1000, now: 1000 + UNRESPONSIVE_MS, phase: 'collapsed', dragging: false })).toBe(true);
    expect(isUnresponsive({ askedAt: 1000, now: 1000 + UNRESPONSIVE_MS, phase: 'notice', dragging: false })).toBe(true);
    // It opened, nothing was asked, or a real drag is going on.
    expect(isUnresponsive({ askedAt: 1000, now: 99_000, phase: 'expanded', dragging: false })).toBe(false);
    expect(isUnresponsive({ askedAt: null, now: 99_000, phase: 'collapsed', dragging: false })).toBe(false);
    expect(isUnresponsive({ askedAt: 1000, now: 99_000, phase: 'collapsed', dragging: true })).toBe(false);
  });
});

describe('opened from the Explorer', () => {
  const fromExplorer = run([{ type: 'expand', pin: false, click: true }, { type: 'settled', phase: 'expanded' }, { type: 'holds', holds: ['step'] }]);

  it('is not pinned, and does not close because the cursor is not there', () => {
    expect(fromExplorer.pinned).toBe(false);
    expect(fromExplorer.clicked).toBe(true);
    expect(run([{ type: 'pointer', inside: false }], fromExplorer).phase).toBe('expanded');
  });

  it('closes with a click outside even with its step half done, unless pinned or in a dialog', () => {
    expect(run([{ type: 'outside' }], fromExplorer).phase).toBe('collapsing');
    expect(run([{ type: 'pin-toggled' }, { type: 'outside' }], fromExplorer).phase).toBe('expanded');
    expect(run([{ type: 'holds', holds: ['step', 'dialog'] }, { type: 'outside' }], fromExplorer).phase).toBe('expanded');
  });

  it('forgets it was opened that way once closed', () => {
    const closed = run([{ type: 'collapse', farewell: true }, { type: 'settled', phase: 'collapsed' }], fromExplorer);
    expect(closed.clicked).toBe(false);
    // Opened again by hover, a click outside does nothing on the pill.
    expect(run([{ type: 'pointer', inside: true }, { type: 'expand', pin: false }, { type: 'settled', phase: 'expanded' }, { type: 'outside' }], closed).phase).toBe('expanded');
  });
});

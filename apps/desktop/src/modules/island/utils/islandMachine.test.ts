import { describe, expect, it } from 'vitest';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import { getToggleDelay } from '@/modules/island/utils/collapseDelay';
import { areaKindFor, checkInvariants, INITIAL_MACHINE, islandReducer, toIslandState } from '@/modules/island/utils/islandMachine';

const NOTICE = { message: 'Listo · contrato.pdf', tone: 'success' as const };

const run = (events: IslandEvent[], from: IslandMachine = INITIAL_MACHINE): IslandMachine =>
  events.reduce((machine, event) => {
    const next = islandReducer(machine, event);
    expect(checkInvariants(next)).toEqual([]);
    return next;
  }, from);

const OPEN: IslandEvent[] = [{ type: 'pointer', inside: true }, { type: 'expand', pin: false }, { type: 'settled', phase: 'expanded' }];

describe('island machine', () => {
  it('ignores a task that finishes while the island is closing, and lands on the pill', () => {
    const closing = run([...OPEN, { type: 'pointer', inside: false }, { type: 'collapse', farewell: false }, { type: 'notice', notice: NOTICE }]);
    expect(closing.phase).toBe('collapsing');
    expect(closing.notice).toBeNull();

    const settled = run([{ type: 'settled', phase: 'collapsed' }], closing);
    expect(settled.phase).toBe('collapsed');
    expect(areaKindFor(settled.phase)).toBe('collapsed');
  });

  it('keeps the wide notice when the cursor leaves, then goes back to the pill', () => {
    const notice = run([{ type: 'notice', notice: NOTICE }, { type: 'pointer', inside: true }, { type: 'pointer', inside: false }]);
    expect(notice.phase).toBe('notice');

    expect(run([{ type: 'notice-ended' }], notice).phase).toBe('collapsed');
  });

  it('replaces the text when a queued task finishes during the notice, instead of stacking a new one', () => {
    const second = run([{ type: 'notice', notice: NOTICE }, { type: 'notice', notice: { ...NOTICE, message: 'Listo · otro.pdf' } }]);

    expect(second.phase).toBe('notice');
    expect(second.notice?.message).toBe('Listo · otro.pdf');
  });

  it('opens pinned from the notice; the notice ending later changes nothing', () => {
    const pinned = run([{ type: 'notice', notice: NOTICE }, { type: 'expand', pin: true }, { type: 'notice-ended' }, { type: 'settled', phase: 'expanded' }]);

    expect(pinned.phase).toBe('expanded');
    expect(pinned.pinned).toBe(true);
    expect(pinned.notice).toBeNull();
  });

  it('closes after leaving the signing screen and still shows the queued task result', () => {
    const signing = run([...OPEN, { type: 'expand', pin: true }, { type: 'pointer', inside: false }]);
    // While signing the panel is busy: leaving does not close it.
    expect(getToggleDelay({ state: toIslandState(signing.phase), inside: false, dragging: false, blocked: true })).toBeNull();

    const closed = run([{ type: 'collapse', farewell: false }, { type: 'settled', phase: 'collapsed' }, { type: 'notice', notice: NOTICE }], signing);
    expect(closed.phase).toBe('notice');
    expect(closed.pinned).toBe(false);
  });

  it('drops a stale settle after a fullscreen app hides it mid-animation', () => {
    const hidden = run([{ type: 'expand', pin: true }, { type: 'fullscreen', on: true }, { type: 'settled', phase: 'expanded' }]);
    expect(hidden.phase).toBe('hidden');

    const back = run([{ type: 'fullscreen', on: false }], hidden);
    expect(back.phase).toBe('collapsed');
    expect(back.resets).toBe(hidden.resets + 1);
  });

  it('always recovers a working pill from the tray, whatever it was doing', () => {
    const stuck = run([...OPEN, { type: 'collapse', farewell: true }, { type: 'notice', notice: NOTICE }]);
    const shown = run([{ type: 'tray', hidden: true }, { type: 'tray', hidden: false }], stuck);

    expect(shown.phase).toBe('collapsed');
    expect(shown.locked).toBe(false);
    expect(run([{ type: 'pointer', inside: true }, { type: 'expand', pin: false }], shown).phase).toBe('expanding');
  });

  it('stays hidden while either the fullscreen app or the tray asks for it', () => {
    const both = run([{ type: 'tray', hidden: true }, { type: 'fullscreen', on: true }, { type: 'fullscreen', on: false }]);
    expect(both.phase).toBe('hidden');
    expect(run([{ type: 'tray', hidden: false }], both).phase).toBe('collapsed');
  });

  it('locks hover after closing with the cursor inside until it leaves', () => {
    const closed = run([...OPEN, { type: 'collapse', farewell: true }, { type: 'settled', phase: 'collapsed' }]);
    expect(closed.locked).toBe(true);
    expect(run([{ type: 'pointer', inside: false }], closed).locked).toBe(false);
  });

  it('keeps every invariant through a long random sequence', () => {
    const events: IslandEvent[] = [
      { type: 'pointer', inside: true },
      { type: 'pointer', inside: false },
      { type: 'expand', pin: false },
      { type: 'expand', pin: true },
      { type: 'collapse', farewell: false },
      { type: 'collapse', farewell: true },
      { type: 'settled', phase: 'expanded' },
      { type: 'settled', phase: 'collapsed' },
      { type: 'pin-toggled' },
      { type: 'notice', notice: NOTICE },
      { type: 'notice-ended' },
      { type: 'fullscreen', on: true },
      { type: 'fullscreen', on: false },
      { type: 'tray', hidden: true },
      { type: 'tray', hidden: false },
      { type: 'reset' },
    ];

    let seed    = 7;
    let machine = INITIAL_MACHINE;

    for (let index = 0; index < 5000; index += 1) {
      seed    = (seed * 1103515245 + 12345) % 2147483648;
      machine = run([events[seed % events.length]], machine);
    }

    const pill = getIslandArea('collapsed');
    expect(['collapsed', 'expanding', 'expanded', 'collapsing', 'notice'].every((phase) => {
      const area = getIslandArea(areaKindFor(phase as IslandMachine['phase']));
      return area.width >= pill.width && area.height >= pill.height;
    })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import { getToggleDelay } from '@/modules/island/utils/collapseDelay';
import { areaKindFor, checkInvariants, hoverEnabled, INITIAL_MACHINE, isHeldOpen, islandReducer, toIslandState } from '@/modules/island/utils/islandMachine';

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
    const signing = run([...OPEN, { type: 'holds', holds: ['sign'] }, { type: 'pointer', inside: false }]);
    // While signing, leaving does not close it.
    expect(isHeldOpen(signing)).toBe(true);
    expect(getToggleDelay({ state: toIslandState(signing.phase), inside: false, dragging: false, blocked: isHeldOpen(signing) })).toBeNull();

    const left   = run([{ type: 'holds', holds: [] }], signing);
    const closed = run([{ type: 'collapse', farewell: false }, { type: 'settled', phase: 'collapsed' }, { type: 'notice', notice: NOTICE }], left);
    expect(closed.phase).toBe('notice');
    expect(closed.pinned).toBe(false);
  });

  it('closes on leave while a task runs: only the person being in the middle of something holds it', () => {
    const working = run([...OPEN, { type: 'pointer', inside: false }]);
    expect(isHeldOpen(working)).toBe(false);
    expect(getToggleDelay({ state: toIslandState(working.phase), inside: false, dragging: false, blocked: isHeldOpen(working) })).not.toBeNull();

    for (const hold of ['drag', 'step', 'sign', 'dialog'] as const) {
      expect(isHeldOpen(run([{ type: 'holds', holds: [hold] }], working))).toBe(true);
    }

    expect(isHeldOpen(run([{ type: 'pin-toggled' }], working))).toBe(true);
  });

  it('still closes on purpose (Esc, Recoger) while held', () => {
    const held = run([...OPEN, { type: 'holds', holds: ['step'] }, { type: 'collapse', farewell: true }]);
    expect(held.phase).toBe('collapsing');
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

  it('hides from an open panel while a zone of the screen is chosen and comes back as a pill with room for the notice', () => {
    const choosing = run([...OPEN, { type: 'capture', on: true }]);
    expect(choosing.phase).toBe('hidden');
    expect(run([{ type: 'expand', pin: true }], choosing).phase).toBe('hidden');

    const back = run([{ type: 'capture', on: false }], choosing);
    expect(back.phase).toBe('collapsed');
    expect(back.resets).toBe(choosing.resets + 1);
    expect(run([{ type: 'notice', notice: NOTICE }], back).phase).toBe('notice');
  });

  it('a capture that ends during a fullscreen app keeps it hidden', () => {
    const both = run([{ type: 'capture', on: true }, { type: 'fullscreen', on: true }, { type: 'capture', on: false }]);
    expect(both.phase).toBe('hidden');
    expect(run([{ type: 'fullscreen', on: false }], both).phase).toBe('collapsed');
  });

  it('while it is dragged it does not open, not even on hover, and opens again once dropped', () => {
    const moving = run([{ type: 'pointer', inside: true }, { type: 'moving', on: true }]);

    expect(moving.moving).toBe(true);
    expect(hoverEnabled(moving)).toBe(false);
    expect(run([{ type: 'expand', pin: false }], moving).phase).toBe('collapsed');
    expect(run([{ type: 'expand', pin: true }], moving).phase).toBe('collapsed');

    const dropped = run([{ type: 'moving', on: false }], moving);
    expect(hoverEnabled(dropped)).toBe(true);
    expect(run([{ type: 'expand', pin: false }], dropped).phase).toBe('expanding');
  });

  it('only the resting pill can be dragged; a notice gives way to it', () => {
    const open = run([...OPEN, { type: 'moving', on: true }]);
    expect(open.moving).toBe(false);
    expect(open.phase).toBe('expanded');

    const telling = run([{ type: 'notice', notice: NOTICE }, { type: 'moving', on: true }]);
    expect(telling.phase).toBe('collapsed');
    expect(telling.notice).toBeNull();
    expect(run([{ type: 'notice', notice: NOTICE }], telling).phase).toBe('collapsed');
  });

  it('a fullscreen app or the tray in the middle of a drag drop it', () => {
    const moving = run([{ type: 'moving', on: true }, { type: 'fullscreen', on: true }]);
    expect(moving.moving).toBe(false);
    expect(run([{ type: 'fullscreen', on: false }], moving).moving).toBe(false);
  });

  it('hidden at rest it opens and closes as always, and closed there is nothing to widen or drag', () => {
    const hidden = run([{ type: 'rest', rest: 'hidden' }]);
    expect(hidden.phase).toBe('collapsed');

    const opened = run([{ type: 'pointer', inside: true }, { type: 'expand', pin: false }, { type: 'settled', phase: 'expanded' }], hidden);
    expect(opened.phase).toBe('expanded');

    const closed = run([{ type: 'pointer', inside: false }, { type: 'collapse', farewell: false }, { type: 'settled', phase: 'collapsed' }], opened);
    expect(closed.phase).toBe('collapsed');
    expect(closed.rest).toBe('hidden');

    expect(run([{ type: 'notice', notice: NOTICE }], closed).phase).toBe('collapsed');
    expect(run([{ type: 'moving', on: true }], closed).moving).toBe(false);
  });

  it('going hidden drops a notice on the pill; back to the pill everything works again', () => {
    const telling = run([{ type: 'notice', notice: NOTICE }, { type: 'rest', rest: 'hidden' }]);
    expect(telling.phase).toBe('collapsed');
    expect(telling.notice).toBeNull();

    const pill = run([{ type: 'rest', rest: 'pill' }], telling);
    expect(run([{ type: 'notice', notice: NOTICE }], pill).phase).toBe('notice');
  });

  it('hidden at rest stays apart from hidden by a fullscreen app or the tray', () => {
    const both = run([{ type: 'rest', rest: 'hidden' }, { type: 'tray', hidden: true }]);
    expect(both.phase).toBe('hidden');

    const back = run([{ type: 'tray', hidden: false }], both);
    expect(back.phase).toBe('collapsed');
    expect(back.rest).toBe('hidden');
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
      { type: 'capture', on: true },
      { type: 'capture', on: false },
      { type: 'moving', on: true },
      { type: 'moving', on: false },
      { type: 'rest', rest: 'hidden' },
      { type: 'rest', rest: 'pill' },
      { type: 'reset' },
      { type: 'holds', holds: ['dialog'] },
      { type: 'holds', holds: [] },
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

import { describe, expect, it } from 'vitest';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import type { IslandPhase } from '@/modules/island/types/islandPhase';
import { INITIAL_MACHINE, islandReducer, toIslandState } from '@/modules/island/utils/islandMachine';
import { planNotice } from '@/modules/island/utils/noticePlan';

const NOTICE = { message: 'Copié 42 palabras', tone: 'success' as const, entryId: '7' };

// Plays the island as useIsland and the timeline do: the machine decides, the view answers with the
// events it would send (a settle when an animation ends, notice-ended when the notice goes away).
const drive = (events: IslandEvent[], reduced: boolean): IslandPhase[] => {
  let machine: IslandMachine = INITIAL_MACHINE;
  let live                   = false;
  const phases: IslandPhase[] = [];

  const send = (event: IslandEvent) => {
    machine = islandReducer(machine, event);
    phases.push(machine.phase);
  };

  events.forEach((event) => {
    send(event);

    if (machine.phase === 'expanding') send({ type: 'settled', phase: 'expanded' });
    if (machine.phase === 'collapsing') send({ type: 'settled', phase: 'collapsed' });

    if (event.type === 'notice' && machine.phase === 'notice') {
      const plan = planNotice({ live, moving: false, settled: toIslandState(machine.phase) === 'expanded' ? 'expanded' : 'collapsed', reduced });
      live       = plan.action !== 'skip';
      if (plan.action === 'skip') send({ type: 'notice-ended' });
    }

    if (event.type === 'notice-ended') live = false;
  });

  return phases;
};

const OPEN_AND_CLOSE: IslandEvent[] = [
  { type: 'pointer', inside: true },
  { type: 'expand', pin: false },
  { type: 'pointer', inside: false },
  { type: 'collapse', farewell: false },
];

describe('reduced motion', () => {
  it('a notice shows the same with and without it; only its style changes', () => {
    for (const live of [true, false]) {
      for (const moving of [true, false]) {
        for (const settled of ['collapsed', 'expanded'] as const) {
          const full    = planNotice({ live, moving, settled, reduced: false });
          const reduced = planNotice({ live, moving, settled, reduced: true });

          expect(reduced.action).toBe(full.action);
          expect(full.style).toBe('bubble');
          expect(reduced.style).toBe('fade');
        }
      }
    }
  });

  it('the notice on the resting pill is shown, never skipped', () => {
    expect(planNotice({ live: false, moving: false, settled: 'collapsed', reduced: true }).action).toBe('show');
  });

  it('the machine walks the same phases with and without it', () => {
    const scenarios: IslandEvent[][] = [
      [{ type: 'notice', notice: NOTICE }, { type: 'notice-ended' }],
      [{ type: 'notice', notice: NOTICE }, { type: 'notice', notice: NOTICE }, { type: 'notice-ended' }],
      [...OPEN_AND_CLOSE, { type: 'notice', notice: NOTICE }, { type: 'notice-ended' }],
      [{ type: 'notice', notice: NOTICE }, { type: 'pointer', inside: true }, { type: 'expand', pin: false }],
      [{ type: 'capture', on: true }, { type: 'capture', on: false }, { type: 'notice', notice: NOTICE }, { type: 'notice-ended' }],
      [{ type: 'tray', hidden: true }, { type: 'notice', notice: NOTICE }, { type: 'tray', hidden: false }],
    ];

    scenarios.forEach((events) => expect(drive(events, true)).toEqual(drive(events, false)));
  });

  it('with it, a result on the resting pill still reaches the notice phase and keeps its "Ver"', () => {
    const phases = drive([{ type: 'notice', notice: NOTICE }], true);
    expect(phases).toEqual(['notice']);
    expect(islandReducer(INITIAL_MACHINE, { type: 'notice', notice: NOTICE }).notice?.entryId).toBe('7');
  });
});

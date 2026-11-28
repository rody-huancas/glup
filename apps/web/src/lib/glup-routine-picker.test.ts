import { describe, expect, it } from 'vitest';
import { ROUTINE_REST, ROUTINES, isRoutine, pickRoutine, routineRest } from '@/lib/glup-routine-picker';

describe('pickRoutine', () => {
  it('never plays the same routine twice in a row', () => {
    ROUTINES.forEach((last) => {
      [0, 0.25, 0.5, 0.75, 0.999].forEach((value) => {
        expect(pickRoutine({ last, random: () => value })).not.toBe(last);
      });
    });
  });

  it('can reach every other routine, and any one at first', () => {
    const steps   = ROUTINES.length - 1;
    const reached = new Set(Array.from({ length: steps }, (_, step) => pickRoutine({ last: 'wave', random: () => (step + 0.5) / steps })));

    expect([...reached].sort()).toEqual(ROUTINES.filter((routine) => routine !== 'wave').sort());
    expect(ROUTINES).toContain(pickRoutine({ last: null, random: () => 0.999 }));
  });
});

describe('routineRest', () => {
  it('waits between the shortest and the longest rest', () => {
    expect(routineRest(() => 0)).toBe(ROUTINE_REST.min);
    expect(routineRest(() => 0.5)).toBe((ROUTINE_REST.min + ROUTINE_REST.max) / 2);
    expect(routineRest(() => 0.999)).toBeLessThan(ROUTINE_REST.max);
  });
});

describe('isRoutine', () => {
  it('knows only the routine names', () => {
    expect(isRoutine('walk')).toBe(true);
    expect(isRoutine('fly')).toBe(false);
    expect(isRoutine(null)).toBe(false);
  });
});

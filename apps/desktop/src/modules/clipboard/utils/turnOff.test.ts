import { describe, expect, it } from 'vitest';
import { askBeforeTurningOff, turnOffBody, turnOffOutcome } from '@/modules/clipboard/utils/turnOff';

describe('turning the Portapapeles off', () => {
  it('asks only when something is kept', () => {
    expect(askBeforeTurningOff(0)).toBe(false);
    expect(askBeforeTurningOff(1)).toBe(true);
    expect(askBeforeTurningOff(200)).toBe(true);
  });

  it('says how many, with the plural right', () => {
    expect(turnOffBody(12)).toBe('Son 12 elementos. Se quedan solo en tu PC.');
    expect(turnOffBody(1)).toBe('Es 1 elemento. Se queda solo en tu PC.');
  });

  it('"Conservar" turns it off and keeps everything', () => {
    expect(turnOffOutcome('keep')).toEqual({ enabled: false, deleteAll: false });
  });

  it('"Borrar todo" turns it off and removes everything', () => {
    expect(turnOffOutcome('delete')).toEqual({ enabled: false, deleteAll: true });
  });

  it('Esc or a click outside leave it on and remove nothing', () => {
    expect(turnOffOutcome('dismiss')).toEqual({ enabled: true, deleteAll: false });
  });
});

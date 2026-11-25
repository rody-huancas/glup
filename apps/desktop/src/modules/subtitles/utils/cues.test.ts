import { describe, expect, it } from 'vitest';
import type { Cue } from '@/modules/subtitles/interfaces/cue';
import { cueAt, editCue, mergeCues, removeCue, retimeCue, splitCue, splitPoint } from '@/modules/subtitles/utils/cues';

const cues: Cue[] = [
  { start: 0, end: 2000, text: 'Hola a todos' },
  { start: 2000, end: 5000, text: 'hoy cocinamos\nuna salsa' },
  { start: 6000, end: 8000, text: 'Fin' },
];

describe('the phrases being reviewed', () => {
  it('know which one is on screen', () => {
    expect(cueAt(cues, 2500)).toBe(1);
    expect(cueAt(cues, 5500)).toBe(-1);
    expect(cueAt(cues, 0)).toBe(0);
  });

  it('are joined into one', () => {
    const merged = mergeCues(cues, 0);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ start: 0, end: 5000, text: 'Hola a todos hoy cocinamos una salsa' });
    expect(mergeCues(cues, 2)).toBe(cues);
  });

  it('are split at the cursor or in the middle, the time shared by length', () => {
    expect(splitPoint('Hola a todos', 6)).toBe(6);
    expect(splitPoint('Hola a todos')).toBe(6);
    expect(splitPoint('Sola')).toBeNull();
    const split = splitCue(cues, 0, 4);
    expect(split.slice(0, 2)).toEqual([{ start: 0, end: 727, text: 'Hola' }, { start: 727, end: 2000, text: 'a todos' }]);
    expect(splitCue(cues, 2)).toBe(cues);
  });

  it('keep their times inside the video and apart from their neighbours', () => {
    expect(retimeCue({ cues, index: 1, which: 'start', ms: 500, duration: 9000 })[1].start).toBe(2000);
    expect(retimeCue({ cues, index: 1, which: 'end', ms: 7000, duration: 9000 })[1].end).toBe(6000);
    expect(retimeCue({ cues, index: 1, which: 'end', ms: 1000, duration: 9000 })[1].end).toBe(2100);
    expect(retimeCue({ cues, index: 2, which: 'end', ms: 99000, duration: 9000 })[2].end).toBe(9000);
  });

  it('are corrected and removed', () => {
    expect(editCue(cues, 2, 'Fin.')[2].text).toBe('Fin.');
    expect(removeCue(cues, 0).map((cue) => cue.text)).toEqual(['hoy cocinamos\nuna salsa', 'Fin']);
  });
});

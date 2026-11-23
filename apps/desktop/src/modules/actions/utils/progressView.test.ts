import { describe, expect, it } from 'vitest';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import { progressDetail, progressFraction, progressLabel } from '@/modules/actions/utils/progressView';

const line = (change: Partial<ActionProgress>): ActionProgress => ({ current: 0, total: 0, name: '', active: 1, detail: null, stage: 'working', ...change });

describe('progress bar', () => {
  it('counts bytes, pages, files and percent', () => {
    expect(progressFraction(line({ stage: 'downloading', current: 120, total: 480, detail: '120 MB de 480 MB' }))).toBe(0.25);
    expect(progressFraction(line({ current: 2, total: 8 }))).toBe(0.25);
    expect(progressFraction(line({ current: 350, total: 1000, detail: '35 %' }))).toBe(0.35);
  });

  it('moves on its own when nothing can be counted', () => {
    expect(progressFraction(null)).toBeNull();
    expect(progressFraction(line({ current: 0, total: 1 }))).toBeNull();
    expect(progressFraction(line({ stage: 'verifying' }))).toBeNull();
    expect(progressFraction(line({ stage: 'preparing' }))).toBeNull();
    expect(progressFraction(line({ stage: 'saving' }))).toBeNull();
  });

  it('never sits full while the task is still going', () => {
    expect(progressFraction(line({ current: 8, total: 8 }))).toBeNull();
    expect(progressFraction(line({ stage: 'downloading', current: 480, total: 480, detail: '480 MB de 480 MB' }))).toBeNull();
  });
});

describe('progress words', () => {
  it('says the stage, or the action while it works', () => {
    expect(progressLabel({ progress: line({ stage: 'downloading', current: 1, total: 9 }), actionId: 'transcribe', cancelling: false })).toBe('Descargando lo que necesito…');
    expect(progressLabel({ progress: line({ stage: 'verifying' }), actionId: 'transcribe', cancelling: false })).toBe('Comprobando la descarga…');
    expect(progressLabel({ progress: line({ stage: 'preparing' }), actionId: 'transcribe', cancelling: false })).toBe('Preparándome…');
    expect(progressLabel({ progress: line({ current: 3, total: 10 }), actionId: 'transcribe', cancelling: false })).toBe('Pasando a texto…');
    expect(progressLabel({ progress: line({ stage: 'saving' }), actionId: 'compress', cancelling: false })).toBe('Guardando…');
  });

  it('a finished count is shown as saving; with no action, the plain word', () => {
    expect(progressLabel({ progress: line({ current: 4, total: 4 }), actionId: 'convert', cancelling: false })).toBe('Guardando…');
    expect(progressLabel({ progress: null, actionId: null, cancelling: false })).toBe('Trabajando…');
    expect(progressLabel({ progress: line({ stage: 'downloading' }), actionId: 'zip', cancelling: true })).toBe('Cancelando…');
  });

  it('shows the detail only while it counts', () => {
    expect(progressDetail(line({ stage: 'downloading', current: 1, total: 9, detail: '1 MB de 9 MB' }))).toBe('1 MB de 9 MB');
    expect(progressDetail(line({ current: 9, total: 9, detail: '100 %' }))).toBeNull();
    expect(progressDetail(line({ stage: 'saving', detail: 'x' }))).toBeNull();
  });
});

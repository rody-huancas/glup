import { describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { ResultTone } from '@/modules/actions/types/resultTone';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import { withLearning } from '@/modules/background/utils/learnChain';
import type { TaskContext } from '@/modules/tasks/interfaces/taskSpec';

const done: ActionResult = { tone: 'success', message: 'Pasado a texto', note: null, failedNames: [], openPath: null, revealPath: null, revealOpens: false };

const learnable = (installed: boolean, tone: ResultTone = 'success'): Learnable => ({
  id        : 'transcribe-fast',
  texts     : { body: () => '', learning: '', taskTitle: '', learned: () => '', deleteBody: '' },
  getStatus : () => Promise.resolve({ installed, size: 1, partial: 0 }),
  download  : () => Promise.resolve({ tone, message: tone === 'calm' ? 'Dejé la descarga a medias' : 'Listo', note: null }),
  remove    : () => Promise.resolve(),
});

const context = (cancelled: boolean): TaskContext => ({ taskId: 't', onProgress: () => undefined, isCancelled: () => cancelled });

describe('download and action in one task', () => {
  it('runs the action once the download is in place', async () => {
    const run    = vi.fn(() => Promise.resolve(done));
    const result = await withLearning({ learnable: learnable(true), run })(context(false));

    expect(run).toHaveBeenCalledOnce();
    expect(result).toBe(done);
  });

  it('stops after the download when Cancelar was pressed', async () => {
    const run    = vi.fn(() => Promise.resolve(done));
    const result = await withLearning({ learnable: learnable(false, 'calm'), run })(context(true));

    expect(run).not.toHaveBeenCalled();
    expect(result).toMatchObject({ tone: 'calm', message: 'Dejé la descarga a medias' });
  });

  it('does not run the action when the download did not install', async () => {
    const run = vi.fn(() => Promise.resolve(done));
    await withLearning({ learnable: learnable(false), run })(context(false));
    expect(run).not.toHaveBeenCalled();
  });
});

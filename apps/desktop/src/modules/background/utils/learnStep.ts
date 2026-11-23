import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';

export type LearnEvent = 'installed' | 'missing' | 'started' | 'stopped' | 'ready';

// The learning steps: ask to download (learn-model), downloading (learning-model), then the step of the
// action (`done`: the background choice, or what the video is for). A late event from a step already
// left (Volver, another action) changes nothing.
export const nextLearnPhase = (current: ActionsPhase, event: LearnEvent, done: ActionsPhase = 'background'): ActionsPhase => {
  if (event === 'installed') return done;
  if (event === 'missing') return 'learn-model';
  if (event === 'started' && current === 'learn-model') return 'learning-model';
  if (event === 'stopped' && current === 'learning-model') return 'learn-model';
  if (event === 'ready' && current === 'learning-model') return done;

  return current;
};

// 0 to 1 by bytes; null while the size is not known yet.
export const downloadFraction = (current: number, total: number): number | null => (total > 0 ? Math.min(current / total, 1) : null);

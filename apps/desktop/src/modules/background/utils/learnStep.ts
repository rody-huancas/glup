import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';

export type LearnEvent = 'installed' | 'missing' | 'started' | 'stopped' | 'ready';

// The "Quitar fondo" steps: ask to download (learn-model), downloading (learning-model), choose the
// background. A late event from a step already left (Volver, another action) changes nothing.
export const nextLearnPhase = (current: ActionsPhase, event: LearnEvent): ActionsPhase => {
  if (event === 'installed') return 'background';
  if (event === 'missing') return 'learn-model';
  if (event === 'started' && current === 'learn-model') return 'learning-model';
  if (event === 'stopped' && current === 'learning-model') return 'learn-model';
  if (event === 'ready' && current === 'learning-model') return 'background';

  return current;
};

// 0 to 1 by bytes; null while the size is not known yet.
export const downloadFraction = (current: number, total: number): number | null => (total > 0 ? Math.min(current / total, 1) : null);

import { GPU_TEXTS } from '@/modules/transcribe/constants/gpu';
import type { TranscribeEngine } from '@/modules/transcribe/interfaces/transcribeEngine';

// Who listens, in plain words.
export const engineLine = (engine: TranscribeEngine['engine']): string => {
  if (engine.kind === 'gpu') return GPU_TEXTS.usingGpu(engine.name);
  if (engine.kind === 'blocked') return GPU_TEXTS.blocked(engine.name);
  return engine.kind === 'chosen' ? GPU_TEXTS.chosen : GPU_TEXTS.noCard;
};

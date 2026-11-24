import type { GpuMode } from '@/modules/transcribe/types/gpuMode';

// What get_transcribe_engine answers: the mode and who listens (the card, or why the processor).
export interface TranscribeEngine {
  mode   : GpuMode;
  engine :
    | { kind: 'gpu'; name: string }
    | { kind: 'chosen' }
    | { kind: 'noCard' }
    | { kind: 'blocked'; name: string };
}

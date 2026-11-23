import type { TranscribeLanguage } from '@/modules/transcribe/types/transcribeLanguage';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';

// Sent to Rust: the level, and the language (null to detect it).
export interface TranscribeOptions {
  level    : TranscribeLevel;
  language : Exclude<TranscribeLanguage, 'auto' | 'other'> | null;
}

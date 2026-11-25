import type { TrimPurpose } from '@/modules/media/types/trimPurpose';

// The audio or video being trimmed (or made into a GIF).
export interface TrimTarget {
  path    : string;
  name    : string;
  purpose : TrimPurpose;
}

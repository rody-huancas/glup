import type { AppUsage } from '@/modules/performance/interfaces/appUsage';
import type { CloseStep } from '@/modules/performance/types/closeStep';

export interface CloseRequest {
  app   : AppUsage;
  step  : CloseStep;
  error : string | null;
}

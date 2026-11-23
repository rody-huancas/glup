import type { ToastTiming } from '@/modules/notices/types/toastTiming';

export interface NoticeDecision {
  toast  : ToastTiming;
  // A Windows notification.
  system : boolean;
}

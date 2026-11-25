import type { AutoRule } from '@/modules/auto-folders/interfaces/autoRule';

export interface AutoFoldersView {
  pausedAll : boolean;
  rules     : AutoRule[];
  // Something waits for the person: the dot on Tu PC.
  attention : boolean;
}

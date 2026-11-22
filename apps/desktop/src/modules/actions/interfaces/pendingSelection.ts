import type { SelectionType } from '@/modules/actions/types/fileType';

// What is known from the dropped paths alone, before Rust answers.
export interface PendingSelection {
  paths       : string[];
  label       : string;
  type        : SelectionType | null;
  actionCount : number;
}

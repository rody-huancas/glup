import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { SelectionType } from '@/modules/actions/types/fileType';

export interface FileSelection {
  paths   : string[];
  files   : FileInfo[];
  type    : SelectionType;
  actions : ActionDefinition[];
}

export interface SelectionSummary {
  label : string;
  size  : string | null;
}

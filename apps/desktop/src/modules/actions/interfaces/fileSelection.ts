import type { ActionDefinition } from '@/modules/actions/interfaces/actionDefinition';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

export interface FileSelection {
  paths   : string[];
  files   : FileInfo[];
  type    : SupportedFileType;
  actions : ActionDefinition[];
}

export interface SelectionSummary {
  label : string;
  size  : string | null;
}

import type { FileType } from '@/modules/actions/types/fileType';

export interface FileInfo {
  path      : string;
  name      : string;
  extension : string;
  size      : number;
  kind      : FileType;
}

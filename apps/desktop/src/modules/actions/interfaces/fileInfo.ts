import type { FileType } from '@/modules/actions/types/fileType';

export interface FileInfo {
  path      : string;
  name      : string;
  extension : string;
  size      : number;
  kind      : FileType;
  // PDFs: page count (null when unknown) and whether it needs a password.
  pages     : number | null;
  protected : boolean;
}

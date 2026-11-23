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
  // Videos, once Glup can work with them: seconds and the picture as shown (null otherwise).
  duration  : number | null;
  width     : number | null;
  height    : number | null;
}

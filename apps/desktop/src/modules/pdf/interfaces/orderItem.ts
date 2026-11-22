import type { FileType } from '@/modules/actions/types/fileType';

export interface OrderItem {
  path  : string;
  name  : string;
  kind  : FileType;
  pages : number | null;
}

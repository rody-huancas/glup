import type { ImageFormat } from '@/modules/actions/types/imageFormat';

export interface FormatOption {
  format : ImageFormat;
  label  : string;
  hint   : string;
}

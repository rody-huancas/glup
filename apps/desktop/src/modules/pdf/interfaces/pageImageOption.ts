import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';

export interface PageImageOption {
  format : PageImageFormat;
  label  : string;
  hint   : string;
  mime   : string;
}

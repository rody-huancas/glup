import type { PageRotation } from '@/modules/organize/types/pageRotation';

// One page on the screen. `page` is its number in the original PDF, so it also works as its id.
export interface OrganizedPage {
  page     : number;
  rotation : PageRotation;
  // Shown dimmed with "Recuperar" until saving; left out of the new PDF.
  removed  : boolean;
}

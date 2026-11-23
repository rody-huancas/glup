import type { PageRotation } from '@/modules/organize/types/pageRotation';

// What Rust receives for each page of the new PDF, in its new order.
export interface OrganizeRequestPage {
  page     : number;
  rotation : PageRotation;
}

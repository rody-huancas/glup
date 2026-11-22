import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';

// notice: why the files were refused (for example a PDF with a password), when there is a reason.
export interface LoadResult {
  selection : FileSelection | null;
  notice    : string | null;
}

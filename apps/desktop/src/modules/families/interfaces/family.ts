import type { DialogFileType } from '@/modules/actions/types/fileType';
import type { FamilyId } from '@/modules/families/types/familyId';

export interface Family {
  id      : FamilyId;
  name    : string;
  // Under the name on its screen.
  hint    : string;
  // What its drop zone asks for (the file dialog's filter and its words); null: no files (Portapapeles).
  dialog  : DialogFileType | null;
  formats : string | null;
  // Its Glup, for normal and high scaling.
  art     : { small: string; large: string };
}

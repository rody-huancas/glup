import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';

// The photo ready to frame (services/id_photo/mod.rs).
export interface PrepareReport {
  session : number;
  width   : number;
  height  : number;
  crop    : IdCrop;
  warning : string | null;
}

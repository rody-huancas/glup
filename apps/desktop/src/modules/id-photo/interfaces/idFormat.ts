import type { IdKind } from '@/modules/id-photo/types/idKind';

// Sent to Rust as is (services/id_photo/layout.rs).
export interface IdFormat {
  kind     : IdKind;
  widthCm  : number;
  heightCm : number;
}

import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { SaveMode } from '@/modules/settings/types/saveMode';

export interface SaveLocation {
  mode          : SaveMode;
  customFolder  : string | null;
  folderMissing : boolean;
  picking       : boolean;
  destination   : SaveDestination;
  bundleZip      : boolean;
  // "Quitar ubicación" off.
  keepLocation   : boolean;
  // Last "Reducir peso" level for PDFs.
  reduceLevel    : ReduceLevel;
  choose         : (mode: SaveMode) => void;
  setBundleZip   : (bundle: boolean) => void;
  setKeepLocation: (keep: boolean) => void;
  setReduceLevel : (level: ReduceLevel) => void;
}

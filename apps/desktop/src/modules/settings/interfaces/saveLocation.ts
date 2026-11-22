import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { SaveMode } from '@/modules/settings/types/saveMode';

export interface SaveLocation {
  mode          : SaveMode;
  customFolder  : string | null;
  folderMissing : boolean;
  picking       : boolean;
  destination   : SaveDestination;
  bundleZip     : boolean;
  choose        : (mode: SaveMode) => void;
  setBundleZip  : (bundle: boolean) => void;
}

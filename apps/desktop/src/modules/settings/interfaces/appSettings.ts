import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import type { SaveMode } from '@/modules/settings/types/saveMode';

export interface AppSettings {
  saveMode     : SaveMode;
  customFolder : string | null;
  bundleZip    : boolean;
  reduceLevel  : ReduceLevel;
}

export interface SettingsView extends AppSettings {
  folderMissing: boolean;
}

// What run_action receives in its options.
export interface SaveDestination {
  mode   : SaveMode;
  folder : string | null;
}

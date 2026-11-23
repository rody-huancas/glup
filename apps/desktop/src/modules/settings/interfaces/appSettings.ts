import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import type { SaveMode } from '@/modules/settings/types/saveMode';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';

export interface AppSettings {
  saveMode         : SaveMode;
  customFolder     : string | null;
  bundleZip        : boolean;
  reduceLevel      : ReduceLevel;
  // The first-run welcome was answered.
  welcomeSeen      : boolean;
  // "Avisarme con notificaciones de Windows" turned off (on by default).
  notificationsOff : boolean;
  // "Pasar audio a texto": the last level chosen.
  transcribeLevel  : TranscribeLevel;
}

export interface SettingsView extends AppSettings {
  folderMissing: boolean;
}

// What run_action receives in its options.
export interface SaveDestination {
  mode   : SaveMode;
  folder : string | null;
}

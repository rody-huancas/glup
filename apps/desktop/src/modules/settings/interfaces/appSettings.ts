import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandRest } from '@/modules/dock/types/islandRest';
import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import type { SaveMode } from '@/modules/settings/types/saveMode';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';

export interface AppSettings {
  saveMode              : SaveMode;
  customFolder          : string | null;
  bundleZip             : boolean;
  // "Quitar ubicación" turned off: photos keep where they were taken (off by default: the place goes).
  keepLocation          : boolean;
  reduceLevel           : ReduceLevel;
  // The first-run welcome was answered.
  welcomeSeen           : boolean;
  // "Avisarme con notificaciones de Windows" turned off (on by default).
  notificationsOff      : boolean;
  // "Pasar audio a texto": the last level chosen.
  transcribeLevel       : TranscribeLevel;
  // "Copiar texto de la pantalla": the shortcut chosen (null: Glup's own) and whether it is off. Ajustes
  // changes them through set_screen_text_shortcut, which first checks Windows accepts it.
  screenTextShortcut    : string | null;
  screenTextShortcutOff : boolean;
  // "Guardar en el historial lo que copio de la pantalla" turned off (on by default).
  screenTextHistoryOff  : boolean;
  // "Portapapeles": changed through its own commands (set_clipboard_*), which also trim and tell the screen.
  clipboardOn           : boolean;
  clipboardLimit        : number | null;
  clipboardExcluded     : string[];
  clipboardShortcut     : string | null;
  clipboardShortcutOff  : boolean;
  // Where the island lives (null: on top in the middle); changed through set_island_dock.
  islandDock            : IslandDock | null;
  // "Cómo se muestra": island, hidden (modo oculto) or bubble, the delay before a hidden one comes out
  // (ms) and its notice seen, changed through set_island_mode; where the bubble floats.
  islandRest            : IslandRest;
  islandBubble          : BubbleSpot | null;
  revealDelay           : number | null;
  hiddenIntroSeen       : boolean;
  islandShortcut        : string | null;
  islandShortcutOff     : boolean;
}

export interface SettingsView extends AppSettings {
  folderMissing: boolean;
}

// What run_action receives in its options.
export interface SaveDestination {
  mode   : SaveMode;
  folder : string | null;
}

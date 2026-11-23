import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';

// The text shown in the result of "Sacar texto", with what "Guardar como .txt" needs.
export interface ExtractedText {
  text        : string;
  paths       : string[];
  destination : SaveDestination;
  entryId     : string | null;
}

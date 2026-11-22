import type { BackgroundKind } from '@/modules/background/types/backgroundKind';

export interface BackgroundOption {
  kind  : BackgroundKind;
  label : string;
  hint  : string;
}

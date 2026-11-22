import type { FileKind } from '@/modules/mascot/types/fileKind';

export type MascotState =
  | { type: 'idle' }
  | { type: 'alert' }
  | { type: 'eating'; kind: FileKind }
  | { type: 'working' }
  | { type: 'happy' }
  | { type: 'confused' };

export type MascotStateType = MascotState['type'];

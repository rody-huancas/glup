import type { UpdateInfo } from '@/modules/updates/interfaces/updateInfo';
import type { UpdateProgress } from '@/modules/updates/interfaces/updateProgress';
import type { UpdatePhase } from '@/modules/updates/types/updatePhase';

export interface UpdateState {
  version   : string | null;
  available : UpdateInfo | null;
  phase     : UpdatePhase;
  progress  : UpdateProgress | null;
  error     : string | null;
}

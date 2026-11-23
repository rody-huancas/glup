import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';

// One line of "Lo que aprendí": its state and what can be done with it.
export interface Learned {
  learnable  : Learnable;
  status     : ModelStatus | null;
  deleting   : boolean;
  failed     : boolean;
  confirming : boolean;
  ask        : () => void;
  cancel     : () => void;
  confirm    : () => void;
}

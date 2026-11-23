import type { IdFormat } from '@/modules/id-photo/interfaces/idFormat';

// What the "¿Para qué es?" step decided: the size and which files to make.
export interface IdChoice {
  format  : IdFormat;
  outputs : {
    photo : boolean;
    sheet : boolean;
  };
}

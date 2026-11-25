import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';

// "8.300": the dot every three figures from 1.000 on (Intl in Spanish leaves 4 figures together).
export const groupThousands = (count: number): string => String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

interface CleaningLabelParams {
  current : number;
  total   : number;
  // What is going on besides the files (the recycle bin being emptied), when there is something.
  name    : string;
}

// "Borrando 1.240 de 8.300…" while the files go; the general words before (the recycle bin) or without a count.
export const cleaningLabel = ({ current, total, name }: CleaningLabelParams): string =>
  total > 0 && name === '' ? CLEANUP_TEXTS.deleting(groupThousands(current), groupThousands(total)) : CLEANUP_TEXTS.cleaning;

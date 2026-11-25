import { formatCount } from '@/shared/utils/numbers';

export const TASK_TEXTS = {
  waiting  : (count: number) => `${formatCount(count)} en espera`,
  restored : 'Trabajo en curso',
};

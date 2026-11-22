import type { ReduceChoice } from '@/modules/pdf/interfaces/reduceChoice';

export const BYTES_PER_MB = 1024 * 1024;

export const REDUCE_TEXTS = {
  title       : '¿Cuánto lo reduzco?',
  targetLabel : 'Necesito que pese menos de:',
  targetUnit  : 'MB',
  targetField : 'Peso máximo en MB',
  targetError : 'Escribe un número mayor que 0',
};

export const REDUCE_CHOICES: ReduceChoice[] = [
  { level: 'normal', label: 'Normal', hint: 'Se ve igual, pesa menos' },
  { level: 'maximum', label: 'Al máximo', hint: 'Pesa mucho menos, se ve un poco peor' },
];

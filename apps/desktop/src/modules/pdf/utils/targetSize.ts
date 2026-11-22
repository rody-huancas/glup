import { BYTES_PER_MB } from '@/modules/pdf/constants/reduce';

// "2,5" or "2.5" MB to bytes; empty means no limit, anything else that is not a positive number is invalid.
export const parseTargetMb = (text: string): number | null | undefined => {
  const clean = text.trim().replace(',', '.');
  if (clean === '') return null;

  const value = Number(clean);
  if (!Number.isFinite(value) || value <= 0) return undefined;

  return Math.round(value * BYTES_PER_MB);
};

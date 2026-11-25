import { FILE_SIZE_BASE, FILE_SIZE_UNITS } from '@/modules/actions/constants/fileSize';
import { formatDecimal } from '@/shared/utils/numbers';

export const formatFileSize = (bytes: number): string => {
  const exponent  = bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(FILE_SIZE_BASE)) : 0;
  const unitIndex = Math.min(exponent, FILE_SIZE_UNITS.length - 1);
  const value     = bytes / FILE_SIZE_BASE ** unitIndex;
  const decimals  = unitIndex >= 2 ? 1 : 0;

  const formatted = formatDecimal(value, decimals);

  return `${formatted} ${FILE_SIZE_UNITS[unitIndex]}`;
};

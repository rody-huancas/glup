import { RESULT_LIFETIME_MS } from '@/modules/cleanup/constants/categories';

// The scan result is trusted for 30 minutes.
export const isExpired = (finishedAt: number | null, now: number): boolean => finishedAt !== null && now - finishedAt > RESULT_LIFETIME_MS;

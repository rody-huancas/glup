import { DATE_LOCALE, DAY, HOUR, MINUTE, RELATIVE_TEXTS } from '@/modules/history/constants/relativeDate';

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const formatRelativeDate = (iso: string, now: Date = new Date()): string => {
  const date    = new Date(iso);
  const elapsed = now.getTime() - date.getTime();
  const days    = Math.round((startOfDay(now) - startOfDay(date)) / DAY);

  if (elapsed < MINUTE) return RELATIVE_TEXTS.now;
  if (elapsed < HOUR) return RELATIVE_TEXTS.minutes(Math.floor(elapsed / MINUTE));
  if (days === 0) return RELATIVE_TEXTS.hours(Math.floor(elapsed / HOUR));
  if (days === 1) return RELATIVE_TEXTS.yesterday;
  if (days < 7) return RELATIVE_TEXTS.days(days);

  return new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'short' }).format(date);
};

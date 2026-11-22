export const DATE_LOCALE = 'es-PE';

export const MINUTE = 60_000;
export const HOUR   = 60 * MINUTE;
export const DAY    = 24 * HOUR;

export const RELATIVE_TEXTS = {
  now       : 'hace un momento',
  minutes   : (value: number) => `hace ${value} min`,
  hours     : (value: number) => `hace ${value} h`,
  yesterday : 'ayer',
  days      : (value: number) => `hace ${value} días`,
};

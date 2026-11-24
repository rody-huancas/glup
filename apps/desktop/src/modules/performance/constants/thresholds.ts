// Where each phrase starts (percent), and when a disk, a restart or a battery deserve a word.
export const CPU_LEVELS    = { working: 30, busy: 70, full: 90 };
export const MEMORY_LEVELS = { working: 60, busy: 75, full: 88 };
export const DISK_LEVELS   = { working: 20, busy: 60, full: 90 };

// Little space: under 10 % of the disk or under 10 GB; very little, under 5 % or 2 GB.
export const LOW_SPACE_SHARE      = 0.1;
export const LOW_SPACE_BYTES      = 10 * 1024 ** 3;
export const VERY_LOW_SPACE_SHARE = 0.05;
export const VERY_LOW_SPACE_BYTES = 2 * 1024 ** 3;

// Days on before suggesting a restart.
export const RESTART_DAYS = 3;

// A battery that holds less than this (against new) is worn.
export const WORN_BATTERY = 80;

// How often the screen reads while in view.
export const REFRESH_MS = 2000;

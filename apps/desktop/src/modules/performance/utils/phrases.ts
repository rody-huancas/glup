import { LEVEL_TEXTS, PERFORMANCE_TEXTS, UPTIME_TEXTS } from '@/modules/performance/constants/texts';
import {
  CPU_LEVELS,
  DISK_LEVELS,
  LOW_SPACE_BYTES,
  LOW_SPACE_SHARE,
  MEMORY_LEVELS,
  RESTART_DAYS,
  VERY_LOW_SPACE_BYTES,
  VERY_LOW_SPACE_SHARE,
  WORN_BATTERY,
} from '@/modules/performance/constants/thresholds';
import type { BatteryInfo } from '@/modules/performance/interfaces/batteryInfo';
import type { DiskSpace } from '@/modules/performance/interfaces/diskSpace';
import type { UsageLevel } from '@/modules/performance/types/usageLevel';

interface Levels {
  working : number;
  busy    : number;
  full    : number;
}

export const levelOf = (percent: number, levels: Levels): UsageLevel => {
  if (percent >= levels.full) return 'full';
  if (percent >= levels.busy) return 'busy';
  if (percent >= levels.working) return 'working';
  return 'calm';
};

export const cpuLevel    = (percent: number): UsageLevel => levelOf(percent, CPU_LEVELS);
export const memoryLevel = (percent: number): UsageLevel => levelOf(percent, MEMORY_LEVELS);
export const diskLevel   = (percent: number): UsageLevel => levelOf(percent, DISK_LEVELS);

export const cpuPhrase    = (percent: number): string => LEVEL_TEXTS.cpu[cpuLevel(percent)];
export const memoryPhrase = (percent: number): string => LEVEL_TEXTS.memory[memoryLevel(percent)];
export const diskPhrase   = (percent: number): string => LEVEL_TEXTS.disk[diskLevel(percent)];

export const memoryPercent = (used: number, total: number): number => (total > 0 ? (used / total) * 100 : 0);

// null when there is room enough; otherwise how little is left.
export const spaceWarning = (disk: DiskSpace): string | null => {
  const share = disk.total > 0 ? disk.free / disk.total : 1;
  if (share < VERY_LOW_SPACE_SHARE || disk.free < VERY_LOW_SPACE_BYTES) return PERFORMANCE_TEXTS.veryLowSpace;
  if (share < LOW_SPACE_SHARE || disk.free < LOW_SPACE_BYTES) return PERFORMANCE_TEXTS.lowSpace;
  return null;
};

const MINUTE = 60;
const HOUR   = 60 * MINUTE;
const DAY    = 24 * HOUR;

// "3 días", "5 horas", "12 minutos": the biggest unit only, as people say it.
export const uptimeText = (seconds: number): string => {
  if (seconds >= DAY) return UPTIME_TEXTS.days(Math.floor(seconds / DAY));
  if (seconds >= HOUR) return UPTIME_TEXTS.hours(Math.floor(seconds / HOUR));
  return UPTIME_TEXTS.minutes(Math.max(1, Math.floor(seconds / MINUTE)));
};

export const shouldRestart = (seconds: number): boolean => seconds >= RESTART_DAYS * DAY;

export const batteryHealthPhrase = (battery: BatteryInfo): string => {
  if (battery.health === null) return PERFORMANCE_TEXTS.noHealth;
  return battery.health < WORN_BATTERY ? `${PERFORMANCE_TEXTS.health(battery.health)}. ${PERFORMANCE_TEXTS.worn}` : PERFORMANCE_TEXTS.health(battery.health);
};

export const batteryStatePhrase = (battery: BatteryInfo): string => {
  if (battery.charging) return PERFORMANCE_TEXTS.charging;
  return battery.plugged ? PERFORMANCE_TEXTS.plugged : PERFORMANCE_TEXTS.onBattery;
};

// "12", "0,4": one decimal under 10, Spanish comma.
export const percentText = (value: number): string =>
  new Intl.NumberFormat('es', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);

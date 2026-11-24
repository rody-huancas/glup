import type { AppUsage } from '@/modules/performance/interfaces/appUsage';
import type { BatteryInfo } from '@/modules/performance/interfaces/batteryInfo';
import type { DiskSpace } from '@/modules/performance/interfaces/diskSpace';

// One reading of get_performance.
export interface Overview {
  cpu         : number;
  memoryUsed  : number;
  memoryTotal : number;
  diskBusy    : number | null;
  disks       : DiskSpace[];
  battery     : BatteryInfo | null;
  // Seconds since the last restart.
  uptime      : number;
  apps        : AppUsage[];
}

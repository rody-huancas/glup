export interface BatteryInfo {
  percent  : number;
  charging : boolean;
  plugged  : boolean;
  // What it holds full against new (0 to 100), when Windows tells it.
  health   : number | null;
}

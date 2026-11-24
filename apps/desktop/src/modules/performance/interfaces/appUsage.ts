// One app with all its processes (services/performance/apps.rs).
export interface AppUsage {
  // Its program, lowercase: how close_app finds it again.
  id        : string;
  exe       : string | null;
  name      : string;
  // Share of the whole processor, 0 to 100.
  cpu       : number;
  memory    : number;
  processes : number;
  // Windows or Glup: never closed from here.
  protected : boolean;
}

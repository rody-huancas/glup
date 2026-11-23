import type { VideoGoal } from '@/modules/video/types/videoGoal';

// Sent to Rust as is (services/video/plan.rs).
export interface VideoOptions {
  goal        : VideoGoal;
  targetBytes : number | null;
}

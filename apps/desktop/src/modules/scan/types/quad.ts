import type { Point } from '@/shared/interfaces/point';

// The corners of a sheet as shares (0 to 1) of its photo: top left, top right, bottom right, bottom left.
export type Quad = [Point, Point, Point, Point];

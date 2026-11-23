import { MIN_ZONE_SIDE } from '@/modules/screen-text/constants/screenText';
import type { Zone } from '@/modules/screen-text/interfaces/zone';
import type { Point } from '@/shared/interfaces/point';
import type { Size } from '@/shared/interfaces/size';

interface ZoneBetweenParams {
  start  : Point;
  end    : Point;
  bounds : Size;
}

interface ToStillZoneParams {
  zone  : Zone;
  // The still as it is drawn on the overlay (CSS pixels) and its real size (screen pixels).
  shown : Size;
  still : Size;
}

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

// The rectangle of a drag in any direction, kept inside the overlay.
export const zoneBetween = ({ start, end, bounds }: ZoneBetweenParams): Zone => {
  const left   = clamp(Math.min(start.x, end.x), bounds.width);
  const top    = clamp(Math.min(start.y, end.y), bounds.height);
  const right  = clamp(Math.max(start.x, end.x), bounds.width);
  const bottom = clamp(Math.max(start.y, end.y), bounds.height);

  return { x: left, y: top, width: right - left, height: bottom - top };
};

export const isZoneChosen = (zone: Zone): boolean => zone.width >= MIN_ZONE_SIDE && zone.height >= MIN_ZONE_SIDE;

// From what is seen to the pixels of the still. Each overlay covers one monitor with that monitor's
// scale, so the ratio between the still and its drawn size is the scale (1, 1,25, 1,5…) and the zone
// lands on exactly the pixels under it.
export const toStillZone = ({ zone, shown, still }: ToStillZoneParams): Zone => {
  const ratioX = shown.width > 0 ? still.width / shown.width : 0;
  const ratioY = shown.height > 0 ? still.height / shown.height : 0;

  return { x: zone.x * ratioX, y: zone.y * ratioY, width: zone.width * ratioX, height: zone.height * ratioY };
};

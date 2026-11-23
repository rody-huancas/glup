import { MAX_ZOOM, MIN_ZOOM } from '@/modules/id-photo/constants/idPhoto';
import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';

interface MoveParams {
  crop  : IdCrop;
  // How far the pointer moved, in screen pixels, and how many screen pixels one photo pixel takes.
  dx    : number;
  dy    : number;
  scale : number;
}

interface ZoomParams {
  crop      : IdCrop;
  // The crop Glup suggested: zoom is kept between MIN_ZOOM and MAX_ZOOM of it.
  suggested : IdCrop;
  // Above 1 the person looks bigger (the crop gets smaller).
  factor    : number;
}

// Dragging the photo moves the crop the other way (as if moving the paper under the frame).
export const moveCrop = ({ crop, dx, dy, scale }: MoveParams): IdCrop => ({ ...crop, x: crop.x - dx / scale, y: crop.y - dy / scale });

// Bigger or smaller around the crop's center, keeping its proportion.
export const zoomCrop = ({ crop, suggested, factor }: ZoomParams): IdCrop => {
  const zoom   = Math.min(Math.max((suggested.width / crop.width) * factor, MIN_ZOOM), MAX_ZOOM);
  const width  = suggested.width / zoom;
  const height = suggested.height / zoom;
  const center = { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 };
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
};

// The photo's place on screen for a crop shown in a frame `frameHeight` pixels tall.
export const photoOnScreen = (crop: IdCrop, frameHeight: number, photo: { width: number; height: number }) => {
  const scale = frameHeight / crop.height;
  return { scale, left: -crop.x * scale, top: -crop.y * scale, width: photo.width * scale, height: photo.height * scale };
};

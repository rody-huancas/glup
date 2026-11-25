import type { PhotoFrame } from '@/modules/photo-tools/interfaces/photoFrame';
import type { Framing } from '@/modules/social/interfaces/framing';

export const MAX_ZOOM = 4;

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

interface FrameParams {
  // Width over height of the photo and of the size.
  photoAspect  : number;
  targetAspect : number;
  framing      : Framing;
}

// The frame on the photo: the largest of the size's shape at zoom 1, smaller as it gets closer, around
// its centre and never out of the photo (the same as Rust reads it: services/social, frame_pixels).
export const frameFor = ({ photoAspect, targetAspect, framing }: FrameParams): PhotoFrame => {
  const base   = photoAspect > targetAspect ? { width: targetAspect / photoAspect, height: 1 } : { width: 1, height: photoAspect / targetAspect };
  const zoom   = clamp(framing.zoom, 1, MAX_ZOOM);
  const width  = base.width / zoom;
  const height = base.height / zoom;
  return { x: clamp(framing.cx - width / 2, 0, 1 - width), y: clamp(framing.cy - height / 2, 0, 1 - height), width, height };
};

// The centre of the frame as it really is (pulled back inside the photo).
const settle = (params: FrameParams): Framing => {
  const frame = frameFor(params);
  return { cx: frame.x + frame.width / 2, cy: frame.y + frame.height / 2, zoom: clamp(params.framing.zoom, 1, MAX_ZOOM) };
};

interface MoveParams extends FrameParams {
  dx : number;
  dy : number;
}

// Dragged (or moved with the arrows) by dx, dy of the photo; past an edge it stays at the edge.
export const moveFraming = ({ dx, dy, ...params }: MoveParams): Framing => {
  const now = settle(params);
  return settle({ ...params, framing: { ...now, cx: now.cx + dx, cy: now.cy + dy } });
};

export const zoomFraming = (params: FrameParams & { zoom: number }): Framing => settle({ ...params, framing: { ...params.framing, zoom: params.zoom } });

export const CENTERED: Framing = { cx: 0.5, cy: 0.5, zoom: 1 };

// The first frame of a photo: on its face when there is one (a little lower, so the head has room).
export const framingOnFace = (face: PhotoFrame | null): Framing => (face ? { cx: face.x + face.width / 2, cy: face.y + face.height * 0.6, zoom: 1 } : CENTERED);

// «Personalizado» with the proportion kept: the other side follows.
export const keepRatio = (side: number, ratio: number): number => Math.max(1, Math.round(side * ratio));

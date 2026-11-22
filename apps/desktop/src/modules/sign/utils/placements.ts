import {
  DUPLICATE_GAP,
  INITIAL_WIDTH,
  TEXT_FONT_SIZES,
  TEXT_LINE_HEIGHT,
  TEXT_WIDTH_SLACK,
} from '@/modules/sign/constants/sign';
import type { RelativeRect, Size } from '@/modules/sign/interfaces/geometry';
import type { PlacementRequest, SignPlacement, TextContent } from '@/modules/sign/interfaces/placement';
import type { Signature } from '@/modules/sign/interfaces/signature';
import { clampRect } from '@/modules/sign/utils/coordinates';

// Width in PDF points of a text at a font size (canvas in the app, a stub in tests).
export type TextMeasure = (text: string, fontSize: number) => number;

interface ImagePlacementParams {
  signature : Signature;
  page      : number;
  // Page as shown, in points.
  pageSize  : Size;
}

interface TextPlacementParams {
  text     : string;
  page     : number;
  pageSize : Size;
  measure  : TextMeasure;
}

interface LayoutParams {
  placement : SignPlacement;
  pageSize  : Size;
  measure   : TextMeasure;
}

interface ResizeTextParams extends LayoutParams {
  rect : RelativeRect;
}

interface FontSizeParams extends LayoutParams {
  delta : number;
}

interface RepeatParams {
  placement : SignPlacement;
  // Index = page - 1.
  pageSizes : Size[];
  measure   : TextMeasure;
}

export const createPlacementId = (): string => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const centered = (width: number, height: number): RelativeRect => clampRect({ x: 0.5 - width / 2, y: 0.5 - height / 2, width, height });

const clampFont = (size: number): number => Math.min(Math.max(size, TEXT_FONT_SIZES.min), TEXT_FONT_SIZES.max);

// Height of an image placement for its width, so the signature keeps its proportions on that page.
const imageHeight = (width: number, aspect: number, pageSize: Size): number => width * aspect * (pageSize.width / pageSize.height);

// In the center of the page, 30% of its width.
export const createImagePlacement = ({ signature, page, pageSize }: ImagePlacementParams): SignPlacement => ({
  id      : createPlacementId(),
  page,
  rect    : centered(INITIAL_WIDTH, imageHeight(INITIAL_WIDTH, signature.aspect, pageSize)),
  content : { kind: 'image', signatureId: signature.id, path: signature.path, url: signature.url, aspect: signature.aspect },
});

// A text box is as wide as its text and TEXT_LINE_HEIGHT font sizes tall; it keeps its top-left corner.
export const layoutText = ({ placement, pageSize, measure }: LayoutParams): SignPlacement => {
  if (placement.content.kind !== 'text') return placement;

  const { text, fontSize } = placement.content;
  const width              = (measure(text || ' ', fontSize) + fontSize * TEXT_WIDTH_SLACK) / pageSize.width;
  const height             = (fontSize * TEXT_LINE_HEIGHT) / pageSize.height;

  return { ...placement, rect: clampRect({ ...placement.rect, width, height }) };
};

export const createTextPlacement = ({ text, page, pageSize, measure }: TextPlacementParams): SignPlacement => {
  const content: TextContent = { kind: 'text', text, fontSize: TEXT_FONT_SIZES.initial };
  const laid                 = layoutText({ placement: { id: createPlacementId(), page, rect: centered(0, 0), content }, pageSize, measure });

  return { ...laid, rect: centered(laid.rect.width, laid.rect.height) };
};

// Resizing a text changes its font size (from the new height) and keeps the corner that was dragged from.
export const resizeText = ({ placement, rect, pageSize, measure }: ResizeTextParams): SignPlacement => {
  if (placement.content.kind !== 'text') return { ...placement, rect };

  const fontSize = clampFont((rect.height * pageSize.height) / TEXT_LINE_HEIGHT);
  return layoutText({ placement: { ...placement, rect, content: { ...placement.content, fontSize } }, pageSize, measure });
};

export const changeFontSize = ({ placement, delta, pageSize, measure }: FontSizeParams): SignPlacement => {
  if (placement.content.kind !== 'text') return placement;

  const fontSize = clampFont(placement.content.fontSize + delta);
  return layoutText({ placement: { ...placement, content: { ...placement.content, fontSize } }, pageSize, measure });
};

// The same element on another page: same position and width, height recomputed for that page's shape.
export const fitToPage = ({ placement, pageSize, measure }: LayoutParams): SignPlacement => {
  if (placement.content.kind === 'text') return layoutText({ placement, pageSize, measure });

  const height = imageHeight(placement.rect.width, placement.content.aspect, pageSize);
  return { ...placement, rect: clampRect({ ...placement.rect, height }) };
};

export const duplicatePlacement = (placement: SignPlacement): SignPlacement => ({
  ...placement,
  id   : createPlacementId(),
  rect : clampRect({ ...placement.rect, x: placement.rect.x + DUPLICATE_GAP, y: placement.rect.y + DUPLICATE_GAP }),
});

// Copies for every other page.
export const repeatOnAllPages = ({ placement, pageSizes, measure }: RepeatParams): SignPlacement[] =>
  pageSizes
    .map((pageSize, index) => ({ pageSize, page: index + 1 }))
    .filter(({ page }) => page !== placement.page)
    .map(({ pageSize, page }) => fitToPage({ placement: { ...placement, id: createPlacementId(), page }, pageSize, measure }));

export const pagesWithPlacements = (placements: SignPlacement[]): Set<number> => new Set(placements.map((placement) => placement.page));

// Empty texts are left out.
export const toRequests = (placements: SignPlacement[]): PlacementRequest[] =>
  placements.flatMap((placement): PlacementRequest[] => {
    const { page, rect, content } = placement;
    const area                    = { page, x: rect.x, y: rect.y, width: rect.width, height: rect.height };

    if (content.kind === 'image') return [{ ...area, kind: 'image', path: content.path }];
    return content.text.trim() ? [{ ...area, kind: 'text', text: content.text }] : [];
  });

import { KIND_HEX, MAP_PALE } from '@/modules/space/constants/texts';
import type { SpaceKind } from '@/modules/space/types/spaceKind';

type Rgb = [number, number, number];

const DARK_TEXT: Rgb  = [24, 23, 30];
const LIGHT_TEXT: Rgb = [244, 243, 248];
// How much of its own colour a rectangle keeps when its kind barely wins (only that kind: all of it).
const WEAKEST = 0.35;

const parse = (hex: string): Rgb => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as Rgb;
const toHex = (rgb: Rgb): string => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

export const mix = (color: Rgb, background: Rgb, amount: number): Rgb => color.map((value, index) => value * amount + background[index] * (1 - amount)) as Rgb;

const luminance = (rgb: Rgb): number => {
  const [r, g, b] = rgb.map((value) => {
    const share = value / 255;
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

export interface MapColor {
  fill : string;
  text : string;
}

// The colour of a rectangle: its kind, stronger the more that kind dominates it (share, 0 to 1; paler
// when it barely wins, so every colour stays light), and letters dark or light, whichever reads better.
export const mapColor = (kind: SpaceKind, share: number): MapColor => {
  const amount = WEAKEST + (1 - WEAKEST) * Math.min(1, Math.max(0, share));
  const fill   = mix(parse(KIND_HEX[kind]), parse(MAP_PALE), amount);
  const text   = contrast(fill, DARK_TEXT) >= contrast(fill, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
  return { fill: toHex(fill), text: toHex(text) };
};

import { getStroke } from 'perfect-freehand';
import { STROKE_OPTIONS } from '@/modules/sign/constants/sign';

export type StrokePoints = number[][];

const average = (a: number, b: number): number => (a + b) / 2;

// perfect-freehand's outline as an SVG path with smooth quadratic curves.
export const strokePath = (points: StrokePoints): string => {
  const outline = getStroke(points, STROKE_OPTIONS);
  if (outline.length < 4) return '';

  const [first, second, third] = outline;
  let path = `M${first[0].toFixed(2)},${first[1].toFixed(2)} Q${second[0].toFixed(2)},${second[1].toFixed(2)} ${average(second[0], third[0]).toFixed(2)},${average(second[1], third[1]).toFixed(2)} T`;

  for (let index = 2; index < outline.length - 1; index += 1) {
    const current = outline[index];
    const next    = outline[index + 1];
    path += `${average(current[0], next[0]).toFixed(2)},${average(current[1], next[1]).toFixed(2)} `;
  }

  return `${path}Z`;
};
